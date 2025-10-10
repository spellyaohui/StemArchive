const { executeQuery, executeProcedure, sql } = require('../../config/database');

class Notification {
    // 创建通知
    static async create(notificationData) {
        const {
            customerId,
            notificationType,
            title,
            content,
            sendMethod,
            recipient,
            response
        } = notificationData;

        const query = `
            INSERT INTO Notifications (
                CustomerID, NotificationType, Title, Content,
                SendMethod, Recipient, Status
            )
            VALUES (
                @customerId, @notificationType, @title, @content,
                @sendMethod, @recipient, 'Pending'
            );

            SELECT SCOPE_IDENTITY() as ID, * FROM Notifications WHERE ID = SCOPE_IDENTITY();
        `;

        const params = [
            { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
            { name: 'notificationType', value: notificationType, type: sql.NVarChar },
            { name: 'title', value: title, type: sql.NVarChar },
            { name: 'content', value: content, type: sql.NVarChar },
            { name: 'sendMethod', value: sendMethod, type: sql.NVarChar },
            { name: 'recipient', value: recipient, type: sql.NVarChar }
        ];

        const result = await executeQuery(query, params);
        return result[0];
    }

    // 根据客户ID获取通知
    static async getByCustomerId(customerId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const query = `
            SELECT * FROM Notifications
            WHERE CustomerID = @customerId
            ORDER BY CreatedAt DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

            SELECT COUNT(*) as Total FROM Notifications WHERE CustomerID = @customerId;
        `;

        const params = [
            { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
            { name: 'offset', value: offset, type: sql.Int },
            { name: 'limit', value: limit, type: sql.Int }
        ];

        const result = await executeQuery(query, params);
        const notifications = result.slice(0, -1);
        const total = result[result.length - 1].Total;

        return {
            notifications,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // 更新通知状态
    static async updateStatus(id, status, additionalData = {}) {
        const { sendDate, response } = additionalData;

        let setClause = 'Status = @status';
        let params = [
            { name: 'id', value: id, type: sql.UniqueIdentifier },
            { name: 'status', value: status, type: sql.NVarChar }
        ];

        if (sendDate) {
            setClause += ', SendDate = @sendDate';
            params.push({ name: 'sendDate', value: sendDate, type: sql.DateTime });
        }

        if (response) {
            setClause += ', Response = @response';
            params.push({ name: 'response', value: response, type: sql.NVarChar });
        }

        setClause += ', UpdatedAt = GETDATE()';

        const query = `
            UPDATE Notifications SET
                ${setClause}
            WHERE ID = @id;

            SELECT * FROM Notifications WHERE ID = @id;
        `;

        const result = await executeQuery(query, params);
        return result[0];
    }

    // 删除通知
    static async delete(id) {
        const query = `
            DELETE FROM Notifications WHERE ID = @id;
            SELECT @@ROWCOUNT as AffectedRows;
        `;

        const params = [{ name: 'id', value: id, type: sql.UniqueIdentifier }];
        const result = await executeQuery(query, params);
        return result[0].AffectedRows > 0;
    }
}

module.exports = Notification;