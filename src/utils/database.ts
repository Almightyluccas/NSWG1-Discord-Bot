import mysql from 'mysql2';
import {acceptedUsers} from "./request_perscom";

async function insertAcceptedUsersDatabase(conn: mysql.Connection, users: acceptedUsers[]): Promise<void> {
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

async function retrieveUsersDatabase(conn: mysql.Connection): Promise<acceptedUsers[]> {
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
        await insertAcceptedUsersDatabase(conn, newUsers);
    }
    return newUsers;
}





export default {
    retrieveUsersDatabase,
    compareAndInsertUsers,
}