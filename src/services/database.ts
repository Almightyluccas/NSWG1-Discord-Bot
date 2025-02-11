import { PoolConnection } from "mysql2/promise";
import { AcceptedUsers, DeniedUsers, Form1Submission } from "./request_perscom";

export interface FormIdsTable {
    form_id: number;
}

export class DatabaseService {
    private connection: PoolConnection;

    constructor(connection: PoolConnection) {
        this.connection = connection;
    }

    public async putAcceptedUsersTable(users: AcceptedUsers[]): Promise<void> {
        const query = 'INSERT INTO accepted_users (name, user_id, preferred_position) VALUES ?';
        const values = users.map(user => [
            user.first_name, 
            user.user_id, 
            user.preferred_position
        ]);
        try {
            await this.connection.query(query, [values]);
        } catch (err) {
            console.error("Error inserting accepted users:", err);
            throw err;
        }
    }

    public async putFormIdsTable(data: Form1Submission[]): Promise<void> {
        const query = 'INSERT INTO old_forms (form_id) VALUES ?';
        const values = data.map(user => [user.form_id]);
        try {
            await this.connection.query(query, [values]);
        } catch (err) {
            console.error("Error inserting form IDs:", err);
            throw err;
        }
    }

    public async getFormsIdsTable(): Promise<FormIdsTable[]> {
        const query = 'SELECT form_id FROM old_forms';
        try {
            const [results] = await this.connection.query(query);
            return (results as FormIdsTable[]).map(row => ({
                form_id: row.form_id,
            }));
        } catch (err) {
            console.error("Error fetching form IDs:", err);
            throw err;
        }
    }

    public async getUsersDatabase(): Promise<AcceptedUsers[]> {
        const query = 'SELECT name, user_id, preferred_position FROM accepted_users';
        try {
            const [results] = await this.connection.query(query);
            return (results as any[]).map(row => ({
                first_name: row.name,     
                discord_name: '',         
                user_id: row.user_id,  
                preferred_position: row.preferred_position
            }));
        } catch (err) {
            console.error("Error fetching accepted users:", err);
            throw err;
        }
    }

    public async deleteOldForms(users: DeniedUsers[]): Promise<void> {
        const query = 'DELETE FROM old_forms WHERE form_id = ?';
        try {
            for (const user of users) {
                if (user.form_id) {
                    await this.connection.query(query, [user.form_id]);
                }
            }
        } catch (err) {
            console.error("Error deleting old forms:", err);
            throw err;
        }
    }

    public async compareAndInsertUsers(
        acceptedUsers: AcceptedUsers[],
        acceptedUsersDatabase: AcceptedUsers[]
    ): Promise<AcceptedUsers[]> {
        const newUsers = acceptedUsers.filter(
            user => !acceptedUsersDatabase.some(dbUser => dbUser.user_id === user.user_id)
        );

        if (newUsers.length > 0) {
            await this.putAcceptedUsersTable(newUsers);
        }
        return newUsers;
    }
}