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
exports.DatabaseService = void 0;
class DatabaseService {
    constructor(connection) {
        this.connection = connection;
    }
    putAcceptedUsersTable(users) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = 'INSERT INTO accepted_users (name, user_id, preferred_position) VALUES ?';
            const values = users.map(user => [user.name, user.id, user.preferred_position]);
            yield new Promise((resolve, reject) => {
                this.connection.query(query, [values], (err) => {
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
    putFormIdsTable(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = 'INSERT INTO old_forms (form_id) VALUES ?';
            const values = data.map(user => [user.form_id]);
            yield new Promise((resolve, reject) => {
                this.connection.query(query, [values], (err) => {
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
    getFormsIdsTable() {
        return __awaiter(this, void 0, void 0, function* () {
            const query = 'SELECT form_id FROM old_forms';
            return new Promise((resolve, reject) => {
                this.connection.query(query, (err, results) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(results.map(row => ({
                            form_id: row.form_id
                        })));
                    }
                });
            });
        });
    }
    getUsersDatabase() {
        return __awaiter(this, void 0, void 0, function* () {
            const query = 'SELECT name, user_id AS id, preferred_position FROM accepted_users';
            return new Promise((resolve, reject) => {
                this.connection.query(query, (err, results) => {
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
    compareAndInsertUsers(acceptedUsers, acceptedUsersDatabase) {
        return __awaiter(this, void 0, void 0, function* () {
            const newUsers = acceptedUsers.filter(user => !acceptedUsersDatabase.some(dbUser => dbUser.id === user.id));
            if (newUsers.length > 0) {
                yield this.putAcceptedUsersTable(newUsers);
            }
            return newUsers;
        });
    }
}
exports.DatabaseService = DatabaseService;
