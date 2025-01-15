import mysql from 'mysql2';
import {acceptedUsers, Form1Submission} from "./request_perscom";

export interface FormIdsTable {
    form_id : number
}

async function putAcceptedUsersTable(conn: mysql.Connection, users: acceptedUsers[]): Promise<void> {
    const query = 'INSERT INTO accepted_users (name, user_id, preferred_position) VALUES ?';
    const values = users.map(user => [user.name, user.id, user.preferred_position]);
    await new Promise<void>((resolve, reject) => {
        conn.query(query, [values], (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

async function putFormIdsTable(conn: mysql.Connection, data: Form1Submission[]): Promise<void> {
    const query = 'INSERT INTO old_forms (form_id) VALUES ?';
    const values = data.map(user => [user.form_id]);
    await new Promise<void>((resolve, reject) => {
        conn.query(query, [values], (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}
async function getFormsIdsTable(conn: mysql.Connection): Promise<FormIdsTable[]> {
    const query = 'SELECT form_id FROM old_forms';
    return new Promise<FormIdsTable[]>((resolve, reject) => {
        conn.query(query, (err, results) => {
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


async function getUsersDatabase(conn: mysql.Connection): Promise<acceptedUsers[]> {
    const query = 'SELECT name, user_id AS id, preferred_position FROM accepted_users';
    return new Promise<acceptedUsers[]>((resolve, reject) => {
        conn.query(query, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(
                    (results as acceptedUsers[]).map(row => ({
                        name: row.name,
                        id: row.id,
                        preferred_position: row.preferred_position
                    }))
                );
            }
        });
    });
}

async function compareAndInsertUsers(
    acceptedUsers: acceptedUsers[],
    acceptedUsersDatabase: acceptedUsers[],
    conn: mysql.Connection
): Promise<acceptedUsers[]> {
    const newUsers: acceptedUsers[] = acceptedUsers.filter(
        user => !acceptedUsersDatabase.some(dbUser => dbUser.id === user.id)
    );

    if (newUsers.length > 0) {
        await putAcceptedUsersTable(conn, newUsers);
    }
    return newUsers;
}



export default {
    getUsersDatabase,
    getFormsIdsTable,
    putFormIdsTable,
    compareAndInsertUsers,
}