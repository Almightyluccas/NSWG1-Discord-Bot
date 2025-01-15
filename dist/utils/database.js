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
Object.defineProperty(exports, "__esModule", { value: true });
function insertAcceptedUsersDatabase(conn, users) {
    return __awaiter(this, void 0, void 0, function* () {
        const query = 'INSERT INTO accepted_users (name) VALUES (?)';
        for (const user of users) {
            yield new Promise((resolve, reject) => {
                conn.query(query, [user], (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
        }
    });
}
function insertUsersDiscordDatabase(conn, users) {
    return __awaiter(this, void 0, void 0, function* () {
        const query = 'INSERT INTO users_discord (username, discord_id) VALUES (?, ?)';
        for (const user of users) {
            yield new Promise((resolve, reject) => {
                conn.query(query, [user.username, user.discord_id], (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
        }
    });
}
function retrieveUsersDatabase(conn) {
    return __awaiter(this, void 0, void 0, function* () {
        const query = 'SELECT name FROM accepted_users';
        return new Promise((resolve, reject) => {
            conn.query(query, (err, results) => {
                if (err)
                    reject(err);
                else
                    resolve(results.map((row) => row.name)); // Type assertion to ensure `results` is treated as an array of objects
            });
        });
    });
}
function compareAndInsertUsers(acceptedUsers, acceptedUsersDatabase, conn) {
    return __awaiter(this, void 0, void 0, function* () {
        const newUsers = acceptedUsers.filter(user => !acceptedUsersDatabase.includes(user));
        if (newUsers.length > 0) {
            yield insertAcceptedUsersDatabase(conn, newUsers);
        }
        return newUsers;
    });
}
exports.default = {
    insertAcceptedUsersDatabase,
    insertUsersDiscordDatabase,
    retrieveUsersDatabase,
    compareAndInsertUsers,
};
