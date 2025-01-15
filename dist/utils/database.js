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
        const query = 'INSERT INTO accepted_users (name, user_id, preferred_position) VALUES ?';
        const values = users.map(user => [user.name, user.id, user.preferred_position]);
        yield new Promise((resolve, reject) => {
            conn.query(query, [values], (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    });
}
function retrieveUsersDatabase(conn) {
    return __awaiter(this, void 0, void 0, function* () {
        const query = 'SELECT name, user_id AS id, preferred_position FROM accepted_users';
        return new Promise((resolve, reject) => {
            conn.query(query, (err, results) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(results.map(row => ({
                        name: row.name,
                        id: row.id,
                        preferred_position: row.preferred_position
                    })));
                }
            });
        });
    });
}
function compareAndInsertUsers(acceptedUsers, acceptedUsersDatabase, conn) {
    return __awaiter(this, void 0, void 0, function* () {
        const newUsers = acceptedUsers.filter(user => !acceptedUsersDatabase.some(dbUser => dbUser.id === user.id));
        if (newUsers.length > 0) {
            yield insertAcceptedUsersDatabase(conn, newUsers);
        }
        return newUsers;
    });
}
exports.default = {
    retrieveUsersDatabase,
    compareAndInsertUsers,
};
