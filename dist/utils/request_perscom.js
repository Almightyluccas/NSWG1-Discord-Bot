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
exports.PerscomService = void 0;
const axios_1 = __importDefault(require("axios"));
class PerscomService {
    constructor(bearerToken) {
        this.BEARER_TOKEN = bearerToken;
    }
    getSubmissionStatus(submissions, statusId) {
        return __awaiter(this, void 0, void 0, function* () {
            const activeUsers = [];
            for (const submission of submissions) {
                const formId = submission.form_id;
                try {
                    const response = yield axios_1.default.get(`https://api.perscom.io/v2/submissions/${formId}/statuses`, {
                        headers: {
                            Authorization: `Bearer ${this.BEARER_TOKEN}`,
                            'Content-Type': 'application/json',
                        },
                    });
                    const statusData = response.data.data;
                    if (!statusData || statusData.length === 0) {
                        continue;
                    }
                    const matchedStatus = statusData.find(status => status.id === statusId);
                    if (matchedStatus) {
                        activeUsers.push({
                            name: submission.first_name,
                            id: submission.user_id,
                            preferred_position: submission.preferred_position,
                            form_id: submission.form_id,
                            date_of_birth: submission.date_of_birth,
                        });
                    }
                }
                catch (error) {
                    console.error(`Error fetching statuses for formId ${formId}:`, error);
                }
            }
            return activeUsers;
        });
    }
    getAllForm1Data() {
        return __awaiter(this, void 0, void 0, function* () {
            const allForm1Submissions = [];
            let page = 4;
            let lastPage = 1;
            try {
                const metadataResponse = yield fetch('https://api.perscom.io/v2/submissions', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.BEARER_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (!metadataResponse.ok) {
                    console.error(`Metadata response error: ${metadataResponse.status} ${metadataResponse.statusText}`);
                    return [];
                }
                const metadata = yield metadataResponse.json();
                lastPage = metadata.meta.last_page;
            }
            catch (error) {
                console.error('Error fetching metadata:', error);
                return [];
            }
            while (page <= lastPage) {
                try {
                    const response = yield fetch(`https://api.perscom.io/v2/submissions?page=${page}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${this.BEARER_TOKEN}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    if (!response.ok) {
                        console.error(`Error fetching submissions for page ${page}: ${response.status} ${response.statusText}`);
                        break;
                    }
                    const data = yield response.json();
                    const form1Submissions = data.data
                        .filter((submission) => submission.form_id === 1)
                        .map((submission) => ({
                        first_name: submission.first_name,
                        discord_name: submission.discord_name,
                        preferred_position: submission.preferred_position,
                        form_id: submission.id,
                        user_id: submission.user_id,
                        date_of_birth: submission.date_of_birth
                    }));
                    allForm1Submissions.push(...form1Submissions);
                    page++;
                }
                catch (error) {
                    console.error(`Error fetching data on page ${page}:`, error);
                    break;
                }
            }
            return allForm1Submissions;
        });
    }
    clearCache() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.post(`https://api.perscom.io/v2/cache`, null, {
                    headers: {
                        'Authorization': `Bearer ${this.BEARER_TOKEN}`,
                    },
                });
                if (response.status !== 200) {
                    console.warn(`Cache clear responded with: ${response.status} ${response.statusText}`);
                }
            }
            catch (error) {
                console.error('Error clearing cache:', error);
            }
        });
    }
    deleteUsers(users) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const user of users) {
                const options = {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.BEARER_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                };
                try {
                    const response = yield fetch(`https://api.perscom.io/v2/users/${user.id}`, options);
                    if (!response.ok) {
                        const errorMsg = yield response.text();
                        console.error(`Failed to delete user ${user.name}: ${response.status} ${response.statusText} - ${errorMsg}`);
                        continue;
                    }
                    const data = yield response.json();
                    console.log(`Deleted user ${user.name}:`, data);
                }
                catch (err) {
                    console.error(`Error deleting user ${user.name}:`, err);
                }
            }
        });
    }
}
exports.PerscomService = PerscomService;
