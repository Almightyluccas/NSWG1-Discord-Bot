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
exports.fetchPerscomUsers = fetchPerscomUsers;
exports.extractStatusAndName = extractStatusAndName;
exports.extractBottomPageLink = extractBottomPageLink;
exports.extractAcceptedUsers = extractAcceptedUsers;
const axios_1 = __importDefault(require("axios"));
function fetchPerscomUsers(bearerToken_1) {
    return __awaiter(this, arguments, void 0, function* (bearerToken, pageNumber = 5) {
        const url = `https://api.perscom.io/v2/users?page=${pageNumber}`;
        if (!bearerToken) {
            console.error("Error: Bearer token not found.");
            return null;
        }
        try {
            const response = yield axios_1.default.get(url, {
                headers: {
                    Authorization: `Bearer ${bearerToken}`,
                    'Content-Type': 'application/json',
                },
            });
            return response.data;
        }
        catch (error) {
            console.error(`Failed to retrieve data`);
            return null;
        }
    });
}
function extractStatusAndName(data) {
    if (data && data.data) {
        const users = data.data;
        return users.map((user) => [user.name, user.status_id]);
    }
    else {
        return { failed_at: 'extractStatusAndName', error: 'Failed to retrieve data.' };
    }
}
function extractBottomPageLink(data) {
    if (data && data.meta && data.meta.links) {
        const links = data.meta.links;
        const filteredLinks = links
            .filter((link) => link.label !== 'Next »')
            .map((link) => link.label);
        return filteredLinks.slice(-2);
    }
    else {
        return { failed_at: 'extractBottomPageLink', error: 'Failed to retrieve data.' };
    }
}
function extractAcceptedUsers(data, activeStatusId = 7) {
    if (data && data.data) {
        const users = data.data;
        const activeUsers = users
            .filter((user) => user.status_id === activeStatusId)
            .map((user) => user.name);
        return activeUsers;
    }
    else {
        return ['extractAcceptedUsers', 'Failed to retrieve data.'];
    }
}
exports.default = {
    fetchPerscomUsers,
    extractStatusAndName,
    extractBottomPageLink,
    extractAcceptedUsers,
};
