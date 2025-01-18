import mysql from 'mysql2';
import { AcceptedUsers, Form1Submission } from "./request_perscom";

export interface FormIdsTable {
    form_id: number;
}

export class DatabaseService {
    private connection: mysql.Connection;

    constructor(connection: mysql.Connection) {
        this.connection = connection;
    }

    public async putAcceptedUsersTable(users: AcceptedUsers[]): Promise<void> {
        const query = 'INSERT INTO accepted_users (name, user_id, preferred_position) VALUES ?';
        const values = users.map(user => [user.name, user.id, user.preferred_position]);
        await new Promise<void>((resolve, reject) => {
            this.connection.query(query, [values], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    public async putFormIdsTable(data: Form1Submission[]): Promise<void> {
        const query = 'INSERT INTO old_forms (form_id) VALUES ?';
        const values = data.map(user => [user.form_id]);
        await new Promise<void>((resolve, reject) => {
            this.connection.query(query, [values], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    public async getFormsIdsTable(): Promise<FormIdsTable[]> {
        const query = 'SELECT form_id FROM old_forms';
        return new Promise<FormIdsTable[]>((resolve, reject) => {
            this.connection.query(query, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(
                        (results as FormIdsTable[]).map(row => ({
                            form_id: row.form_id
                        }))
                    );
                }
            });
        });
    }

    public async getUsersDatabase(): Promise<AcceptedUsers[]> {
        const query = 'SELECT name, user_id AS id, preferred_position FROM accepted_users';
        return new Promise<AcceptedUsers[]>((resolve, reject) => {
            this.connection.query(query, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(
                        (results as AcceptedUsers[]).map(row => ({
                            name: row.name,
                            id: row.id,
                            preferred_position: row.preferred_position
                        }))
                    );
                }
            });
        });
    }

    public async compareAndInsertUsers(
        acceptedUsers: AcceptedUsers[],
        acceptedUsersDatabase: AcceptedUsers[]
    ): Promise<AcceptedUsers[]> {
        const newUsers: AcceptedUsers[] = acceptedUsers.filter(
            user => !acceptedUsersDatabase.some(dbUser => dbUser.id === user.id)
        );

        if (newUsers.length > 0) {
            await this.putAcceptedUsersTable(newUsers);
        }
        return newUsers;
    }
}