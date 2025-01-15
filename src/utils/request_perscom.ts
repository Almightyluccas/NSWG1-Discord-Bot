import axios from 'axios';

interface Submission {
    id: number;
    form_id: number;
    user_id: number;
    created_at: string;
    updated_at: string;
    arma_3_id: string;
    discord_name: string;
    first_name: string;
    date_of_birth: string;
    email_address: string;
    previous_unit: number;
    preferred_position: number;
    why_do_you_want_to_join_red_squadron: string;
    label: string;
}
interface StatusResponse {
    data: Status[];
    links: {
        first: string;
        last: string;
        prev: string | null;
        next: string | null;
    };
    meta: {
        current_page: number;
        from: number;
        last_page: number;
        to: number;
        total: number;
        path: string;
        per_page: number;
        links: {
            url: string | null;
            label: string;
            active: boolean;
        }[];
    };
}

interface Status {
    id: number;
    name: string;
    color: string;
    order: number;
    created_at: string;
    updated_at: string;
    label: string;
}


export interface Form1Submission {
    first_name: string;
    discord_name: string;
    preferred_position: number;
    user_id: number;
    form_id: number;
}

export interface acceptedUsers {
    name: string;
    id: number;
    preferred_position: number;
}

export async function extractAcceptedUsers(
    submissions: Form1Submission[],
    BEARER_TOKEN: string
): Promise<acceptedUsers[]> {
    const activeUsers: acceptedUsers[] = [];
    const activeStatusId: number = 7; // ID for "Accepted" status

    for (const submission of submissions) {
        const formId = submission.form_id;

        try {
            // Fetch status from the API with `axios.get`
            const response = await axios.get<StatusResponse>(
                `https://api.perscom.io/v2/submissions/${formId}/statuses`,
                {
                    headers: {
                        Authorization: `Bearer ${BEARER_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            const statusData = response.data.data; // Extract the "data" array

            // Check if 'data' is empty
            if (!statusData || statusData.length === 0) {
                console.log(`No statuses found for formId: ${formId}`);
                continue; // Skip this submission if there are no statuses
            }

            // Look for a matching activeStatusId in the array
            const matchedStatus = statusData.find(status => status.id === activeStatusId);
            if (matchedStatus) {
                // Add the user to the active users array if a match is found
                activeUsers.push({
                    name: submission.first_name,
                    id: submission.user_id,
                    preferred_position: submission.preferred_position, // Update based on your requirements
                });
            }
        } catch (error) {
            console.error(`Error fetching statuses for formId: ${formId}`, error);
        }
    }
    return activeUsers;
}

async function fetchAllForm1Data(bearerToken: string): Promise<Form1Submission[]> {
    const allForm1Submissions: Form1Submission[] = [];
    let page = 4;  // Start from page 4
    let lastPage = 1;

    try {
        const metadataResponse = await fetch('https://api.perscom.io/v2/submissions', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type': 'application/json'
            }
        });

        const metadata = await metadataResponse.json();
        lastPage = metadata.meta.last_page;
    } catch (error) {
        console.error('Error fetching metadata:');
        return [];
    }

    while (page <= lastPage) {
        try {
            const response = await fetch(`https://api.perscom.io/v2/submissions?page=${page}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${bearerToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            const form1Submissions = data.data
                .filter((submission: Submission) => submission.form_id === 1)
                .map((submission: Submission): Form1Submission => ({
                    first_name: submission.first_name,
                    discord_name: submission.discord_name,
                    preferred_position: submission.preferred_position,
                    form_id: submission.id,
                    user_id: submission.user_id
                }));

            allForm1Submissions.push(...form1Submissions);

            page++;
        } catch (error) {
            console.error('Error fetching data:', error);
            break;
        }
    }
    return allForm1Submissions;
}





export default {
    fetchAllForm1Data,
    extractAcceptedUsers,
}