import { ChatInputCommandInteraction, SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, Colors, StringSelectMenuInteraction, ComponentType,
    Guild } from "discord.js";
import Table from 'cli-table3';
import { Command } from "../interfaces/Command";
import { getPlayerAttendance, AttendanceRecord, TRACKING_START_DATE } from "../services/attendanceService";

function getMemberOptions(members: Array<{ id: string, displayName: string }>, page: number = 0) {
    const ITEMS_PER_PAGE = 24;
    const start = page * ITEMS_PER_PAGE;
    const items = members.slice(start, start + ITEMS_PER_PAGE);
    const hasMore = members.length > start + ITEMS_PER_PAGE;

    const options = items.map(member => ({
        label: member.displayName,
        value: `member_${member.id}`,
        description: `View attendance for ${member.displayName}`
    }));

    if (hasMore) {
        options.push({
            label: "Next Page",
            value: `page_${page + 1}`,
            description: `View more members (${start + ITEMS_PER_PAGE + 1}-${Math.min(start + ITEMS_PER_PAGE * 2, members.length)})`
        });
    }

    return options;
}

export const attendanceCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('nswg-attendance')
        .setDescription('View member attendance calendar')
        .addStringOption(option =>
            option.setName('month')
                .setDescription('Select which month to view')
                .setRequired(false)
                .addChoices(
                    { name: '📆 Choose Custom Date', value: 'custom' },
                    { name: '⬅️ Last Month', value: 'last' },
                    { name: '⬅️ Two Months Ago', value: 'two_months_ago' },
                    { name: '⬅️ Three Months Ago', value: 'three_months_ago' }
                ))
        .addStringOption(option =>
            option.setName('custom_date')
                .setDescription('For custom date, enter MM/YYYY format (e.g., 02/2024)')
                .setRequired(false)) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        try {
            await interaction.deferReply();

            const monthChoice = interaction.options.getString('month');
            const customDate = interaction.options.getString('custom_date');
            const today = new Date();
            
            let currentYear = today.getFullYear();
            let currentMonth = today.getMonth();

            if (monthChoice === 'custom') {
                if (!customDate) {
                    await interaction.editReply({
                        content: 'When choosing custom date, you must provide a date in MM/YYYY format in the custom_date option.'
                    });
                    return;
                }

                const dateRegex = /^(0[1-9]|1[0-2])\/(\d{4})$/;
                if (!dateRegex.test(customDate)) {
                    await interaction.editReply({
                        content: 'Invalid date format. Please use MM/YYYY format (e.g., 02/2024). Month must be two digits (01-12).'
                    });
                    return;
                }

                const [monthStr, yearStr] = customDate.split('/');
                currentMonth = parseInt(monthStr) - 1;
                currentYear = parseInt(yearStr);

                const customDateObj = new Date(Date.UTC(currentYear, currentMonth, 1));
                const trackingStartMonth = new Date(Date.UTC(TRACKING_START_DATE.getFullYear(), TRACKING_START_DATE.getMonth(), 1));
                const todayStartOfMonth = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));

                if (customDateObj < trackingStartMonth) {
                    await interaction.editReply({
                        content: `Cannot view attendance before tracking start date (${TRACKING_START_DATE.toLocaleDateString()})`
                    });
                    return;
                }

                if (customDateObj > todayStartOfMonth) {
                    await interaction.editReply({
                        content: 'Cannot view future dates'
                    });
                    return;
                }
            } else if (monthChoice) {
                switch (monthChoice) {
                    case 'last':
                        if (currentMonth === 0) {
                            currentMonth = 11;
                            currentYear--;
                        } else {
                            currentMonth--;
                        }
                        break;
                    case 'two_months_ago':
                        if (currentMonth === 0) {
                            currentMonth = 10;
                            currentYear--;
                        } else if (currentMonth === 1) {
                            currentMonth = 11;
                            currentYear--;
                        } else {
                            currentMonth -= 2;
                        }
                        break;
                    case 'three_months_ago':
                        if (currentMonth < 3) {
                            currentMonth = currentMonth + 9;
                            currentYear--;
                        } else {
                            currentMonth -= 3;
                        }
                        break;
                }
            }

            if (!interaction.guild) {
                await interaction.editReply({
                    content: 'This command can only be used in a server.'
                });
                return;
            }

            const guild = interaction.guild;
            const members = await fetchGuildMembers(guild);
            
            if (!members || members.length === 0) {
                await interaction.editReply({
                    content: 'Unable to fetch server members. Please ensure the bot has the correct permissions and try again.'
                });
                return;
            }

            const memberList = members
                .filter(m => !m.user.bot)
                .map(m => ({
                    id: m.id,
                    displayName: m.displayName
                }));

            if (memberList.length === 0) {
                await interaction.editReply({
                    content: 'No members found in the server (excluding bots).'
                });
                return;
            }

            console.log(`Found ${memberList.length} members in the server`);

            async function handleMemberSelection(page: number = 0): Promise<string | null> {
                const select = new StringSelectMenuBuilder()
                    .setCustomId('member-select')
                    .setPlaceholder('Select a member')
                    .addOptions(getMemberOptions(memberList, page));

                const row = new ActionRowBuilder<StringSelectMenuBuilder>()
                    .addComponents(select);

                await interaction.editReply({
                    content: '',
                    components: [row]
                });

                try {
                    const selection = await interaction.channel?.awaitMessageComponent({
                        componentType: ComponentType.StringSelect,
                        filter: (i: StringSelectMenuInteraction) => 
                            i.customId === 'member-select' && i.user.id === interaction.user.id,
                        time: 60000
                    });

                    if (!selection?.isStringSelectMenu()) return null;

                    await selection.deferUpdate().catch(() => null);

                    const [type, value] = selection.values[0].split('_');
                    
                    if (type === 'page') {
                        return handleMemberSelection(parseInt(value));
                    }

                    return value;
                } catch (error) {
                    if (error instanceof Error && 'code' in error && (error as any).code !== 10062) {
                        console.error('Member selection error:', error);
                    }
                    return null;
                }
            }

            const selectedMemberId = await handleMemberSelection();
            
            if (!selectedMemberId) {
                await interaction.editReply({
                    content: 'Selection timed out.',
                    components: []
                });
                return;
            }

            const selectedMember = memberList.find(member => member.id === selectedMemberId.replace('member_', ''));

            if (!selectedMember) {
                await interaction.editReply({
                    content: 'Selected member not found.',
                    components: []
                });
                return;
            }

            const memberInfo = {
                id: selectedMember.id,
                displayName: selectedMember.displayName
            };

            try {
                const attendanceData = await getPlayerAttendance(memberInfo.displayName);
                const calendar = generateCalendarEmbed(
                    memberInfo.displayName,
                    attendanceData,
                    currentYear,
                    currentMonth
                );

                await interaction.editReply({
                    content: '',
                    components: []
                });

                await interaction.followUp({
                    embeds: [calendar],
                    ephemeral: true
                });

            } catch (error) {
                console.error('Error fetching attendance data:', error);
                await interaction.editReply({
                    content: 'There was an error retrieving attendance data. This could be due to a database connection issue. Please try again in a few minutes.',
                    components: []
                });
            }

        } catch (error: unknown) {
            console.error('Error executing attendance command:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: `There was an error executing this command: ${errorMessage}`,
                }).catch(() => {});
            } else {
                await interaction.editReply({
                    content: `There was an error executing this command: ${errorMessage}`
                }).catch(() => {});
            }
        }
    }
};

async function fetchGuildMembers(guild: Guild) {
    try {
        console.log(`Attempting to fetch members for server: ${guild.name} (ID: ${guild.id})`);
        console.log(`Current cache size: ${guild.members.cache.size}`);
        
        if (guild.members.cache.size > 0) {
            console.log(`Using ${guild.members.cache.size} cached members from ${guild.name}`);
            return Array.from(guild.members.cache.values());
        }

        if (guild.features.includes('COMMUNITY')) {
            console.log(`${guild.name} is a community server, attempting chunk-based fetch...`);
            try {
                const members = await guild.members.fetch({ withPresences: false });
                console.log(`Successfully fetched ${members.size} members from community server ${guild.name}`);
                return Array.from(members.values());
            } catch (chunkError) {
                console.error(`Chunk fetch failed for community server ${guild.name}:`, chunkError);
            }
        }

        console.log(`Fetching members for ${guild.name} using regular fetch...`);
        const members = await guild.members.fetch({
            time: 120000, 
            withPresences: false
        });
        
        console.log(`Successfully fetched ${members.size} members from ${guild.name}`);
        
        const sampleMembers = Array.from(members.values()).slice(0, 3);
        sampleMembers.forEach(member => {
            console.log(`Sample member: ${member.user.tag} (${member.displayName})`);
        });
        
        return Array.from(members.values());
    } catch (error) {
        console.error(`Error fetching guild members for ${guild.name}:`, error);
        if (error instanceof Error) {
            console.error('Error details:', error.message);
            if ('code' in error) {
                const errorCode = (error as any).code;
                console.error('Discord error code:', errorCode);
                
                if (errorCode === 50001) {
                    console.error('Missing access - Bot lacks necessary permissions');
                } else if (errorCode === 50013) {
                    console.error('Missing permissions - Bot needs additional permissions');
                }
            }
        }

        if (guild.members.cache.size > 0) {
            console.warn(`Falling back to cached members (${guild.members.cache.size} members) for ${guild.name}`);
            return Array.from(guild.members.cache.values());
        }
        
        return null;
    }
}

function generateCalendarEmbed(
    memberName: string, 
    attendanceData: AttendanceRecord[], 
    year: number, 
    month: number
): EmbedBuilder {
    console.log('Generating calendar for:', {
        memberName,
        year,
        month,
        receivedRecords: attendanceData.length
    });

    const calendar = new EmbedBuilder()
        .setTitle(`Attendance Calendar for ${memberName}`)
        .setColor(Colors.Blue)
        .setDescription('Monthly Calendar View\n🟩 = Present | 🟥 = Absent | ⬜ = Not a Raid Day');

    const normalizedMemberName = memberName.replace(/\s+/g, '');
    console.log('Normalized member name:', normalizedMemberName);
    
    const monthAttendance = attendanceData.filter(record => {
        const normalizedRecordName = record.player.replace(/\s+/g, '');
        const matchesMonth = record.date.getUTCFullYear() === year && record.date.getUTCMonth() === month;
        const matchesName = normalizedRecordName === normalizedMemberName;
        
        console.log('Checking record:', {
            date: record.date.toUTCString(),
            recordYear: record.date.getUTCFullYear(),
            recordMonth: record.date.getUTCMonth(),
            normalizedRecordName,
            matchesMonth,
            matchesName
        });

        return matchesMonth && matchesName;
    });

    console.log('Filtered attendance records for month:', monthAttendance);

    const overallAttendance = attendanceData.filter(record => {
        const normalizedRecordName = record.player.replace(/\s+/g, '');
        return record.date >= TRACKING_START_DATE && 
               normalizedRecordName === normalizedMemberName;
    });

    const table = new Table({
        chars: {
            'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
            'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
            'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
            'right': '│', 'right-mid': '┤', 'middle': '│'
        },
        style: {
            'padding-left': 1,
            'padding-right': 1,
            head: [],
            border: []
        }
    });

    const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });
    
    table.push([{
        content: `${monthName} ${year}`,
        colSpan: 7,
        hAlign: 'center'
    }]);

    table.push(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => ({
        content: day,
        hAlign: 'center'
    })));

    const firstDay = new Date(Date.UTC(year, month, 1));
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    let currentWeek = new Array(7).fill({ content: '  ', hAlign: 'center' });
    let totalRaidDays = 0;
    let attendedRaidDays = 0;

    const isRaidDay = (date: Date): boolean => {
        if (date.getUTCFullYear() === TRACKING_START_DATE.getUTCFullYear() &&
            date.getUTCMonth() === TRACKING_START_DATE.getUTCMonth() &&
            date.getUTCDate() === TRACKING_START_DATE.getUTCDate()) {
            return true;
        }
        
        if (date < TRACKING_START_DATE) {
            return false;
        }

        const dayOfWeek = date.getUTCDay();
        return dayOfWeek === 3 || dayOfWeek === 6; 
    };

    const compareDates = (date1: Date, date2: Date): boolean => {
        const date1Time = Date.UTC(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
        const date2Time = Date.UTC(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate());
        
        console.log('Comparing dates:', {
            date1: new Date(date1Time).toUTCString(),
            date2: new Date(date2Time).toUTCString(),
            matches: date1Time === date2Time
        });
        
        return date1Time === date2Time;
    };

    const isCurrentMonth = year === new Date().getUTCFullYear() && month === new Date().getUTCMonth();
    const lastDayToCount = isCurrentMonth ? new Date() : new Date(Date.UTC(year, month + 1, 0));

    for (let day = 1; day <= lastDay; day++) {
        const date = new Date(Date.UTC(year, month, day)); 
        const dayOfWeek = date.getUTCDay();
        const raidDay = isRaidDay(date);

        let dayText = day.toString().padStart(2);
        let cellStyle = { hAlign: 'center' as const };

        if (raidDay && date <= lastDayToCount) {
            totalRaidDays++;
            const wasPresent = monthAttendance.some(record => {
                return compareDates(record.date, date);
            });
            
            if (wasPresent) {
                attendedRaidDays++;
                dayText = `\x1b[32;1m${dayText}\x1b[0m`; // Green for present
            } else {
                dayText = `\x1b[31;1m${dayText}\x1b[0m`; // Red for absent
            }
        }

        currentWeek[dayOfWeek] = { content: dayText, ...cellStyle };

        if (dayOfWeek === 6 || day === lastDay) {
            table.push(currentWeek);
            currentWeek = new Array(7).fill({ content: '  ', hAlign: 'center' });
        }
    }

    let calendarText = '```ansi\n';
    calendarText += table.toString();
    calendarText += '\n```';

    let totalOverallRaidDays = 0;
    let totalOverallAttendedDays = overallAttendance.length;

    let currentDate = new Date(TRACKING_START_DATE);
    const today = new Date();
    
    while (currentDate <= today) {
        if (isRaidDay(currentDate)) {
            totalOverallRaidDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    const monthlyAttendanceRate = totalRaidDays ? Math.round((attendedRaidDays / totalRaidDays) * 100) : 0;
    const overallAttendanceRate = totalOverallRaidDays ? Math.round((totalOverallAttendedDays / totalOverallRaidDays) * 100) : 0;

    if (attendedRaidDays === 0 && totalRaidDays === 0) {
        calendarText += `\nNo attendance data available yet. Tracking begins ${TRACKING_START_DATE.toLocaleDateString()}`;
    } else {
        calendarText += `\nThis Month's Attendance: ${monthlyAttendanceRate}% (${attendedRaidDays}/${totalRaidDays} raids)`;
        calendarText += `\nOverall Attendance: ${overallAttendanceRate}% (${totalOverallAttendedDays}/${totalOverallRaidDays} total raids)`;
    }

    calendar.setDescription(calendarText);
    return calendar;
}
