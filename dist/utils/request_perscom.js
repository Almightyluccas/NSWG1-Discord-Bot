"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractAcceptedUsers = extractAcceptedUsers;
const axios_1 = __importDefault(require("axios"));
function extractAcceptedUsers(submissions, BEARER_TOKEN) {
    return __awaiter(this, void 0, void 0, function* () {
        const activeUsers = [];
        const activeStatusId = 7; // ID for "Accepted" status
        for (const submission of submissions) {
            const formId = submission.form_id;
            try {
                // Fetch status from the API with `axios.get`
                const response = yield axios_1.default.get(`https://api.perscom.io/v2/submissions/${formId}/statuses`, {
                    headers: {
                        Authorization: `Bearer ${BEARER_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                });
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
            }
            catch (error) {
                console.error(`Error fetching statuses for formId: ${formId}`, error);
            }
        }
        return activeUsers;
    });
}
function fetchAllForm1Data(bearerToken) {
    return __awaiter(this, void 0, void 0, function* () {
        const allForm1Submissions = [];
        let page = 4; // Start from page 4
        let lastPage = 1;
        try {
            const metadataResponse = yield fetch('https://api.perscom.io/v2/submissions', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${bearerToken}`,
                    'Content-Type': 'application/json'
                }
            });
            const metadata = yield metadataResponse.json();
            lastPage = metadata.meta.last_page;
        }
        catch (error) {
            console.error('Error fetching metadata:');
            return [];
        }
        while (page <= lastPage) {
            try {
                const response = yield fetch(`https://api.perscom.io/v2/submissions?page=${page}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${bearerToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                const data = yield response.json();
                const form1Submissions = data.data
                    .filter((submission) => submission.form_id === 1)
                    .map((submission) => ({
                    first_name: submission.first_name,
                    discord_name: submission.discord_name,
                    preferred_position: submission.preferred_position,
                    form_id: submission.id,
                    user_id: submission.user_id
                }));
                allForm1Submissions.push(...form1Submissions);
                page++;
            }
            catch (error) {
                console.error('Error fetching data:', error);
                break;
            }
        }
        return allForm1Submissions;
    });
}
exports.default = {
    fetchAllForm1Data,
    extractAcceptedUsers,
};
