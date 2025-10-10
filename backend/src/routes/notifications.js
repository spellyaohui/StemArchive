const express = require('express');
const router = express.Router();
const { executeQuery, sql } = require('../../config/database');

// 获取通知列表
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, customerId, notificationType } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        let params = [];

        if (customerId) {
            whereClause += ' AND CustomerID = @customerId';
            params.push({ name: 'customerId', value: customerId, type: sql.UniqueIdentifier });
        }

        if (notificationType) {
            whereClause += ' AND NotificationType = @notificationType';
            params.push({ name: 'notificationType', value: notificationType, type: sql.NVarChar });
        }

        const query = `
            SELECT
                n.*,
                c.Name as CustomerName,
                c.Phone as CustomerPhone
            FROM Notifications n
            INNER JOIN Customers c ON n.CustomerID = c.ID
            ${whereClause}
            ORDER BY n.CreatedAt DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

            SELECT COUNT(*) as Total FROM Notifications n ${whereClause};
        `;

        params.push(
            { name: 'offset', value: offset, type: sql.Int },
            { name: 'limit', value: limit, type: sql.Int }
        );

        const result = await executeQuery(query, params);
        const notifications = result.slice(0, -1);
        const total = result[result.length - 1].Total;

        res.json({
            status: 'Success',
            message: '获取通知列表成功',
            data: notifications,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('获取通知列表失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取通知列表失败'
        });
    }
});

// 发送通知
router.post('/send', async (req, res) => {
    try {
        const {
            customerId,
            notificationType,
            title,
            content,
            sendMethod,
            recipient
        } = req.body;

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
        const notification = result[0];

        // 模拟发送通知
        await this.sendNotification(notification);

        res.status(201).json({
            status: 'Success',
            message: '通知发送成功',
            data: notification
        });
    } catch (error) {
        console.error('发送通知失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '发送通知失败'
        });
    }
});

// 模拟发送通知
async function sendNotification(notification) {
    // 这里应该集成真实的发送服务（短信、邮件、电话等）
    // 现在只是模拟发送过程
    console.log(`发送通知给 ${notification.Recipient}: ${notification.Title}`);

    // 更新发送状态
    const updateQuery = `
        UPDATE Notifications SET
            Status = 'Sent',
            SendDate = GETDATE()
        WHERE ID = @id;
    `;

    const params = [{ name: 'id', value: notification.ID, type: sql.UniqueIdentifier }];
    await executeQuery(updateQuery, params);
}

// 标记通知为已读
router.put('/:id/read', async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            UPDATE Notifications SET
                Status = 'Read',
                Response = '已查看'
            WHERE ID = @id;

            SELECT @@ROWCOUNT as AffectedRows;
        `;

        const params = [{ name: 'id', value: id, type: sql.UniqueIdentifier }];
        const result = await executeQuery(query, params);

        if (result[0].AffectedRows === 0) {
            return res.status(404).json({
                status: 'Error',
                message: '通知不存在'
            });
        }

        res.json({
            status: 'Success',
            message: '通知已标记为已读'
        });
    } catch (error) {
        console.error('标记通知为已读失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '标记通知为已读失败'
        });
    }
});

// 删除通知
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            DELETE FROM Notifications WHERE ID = @id;
            SELECT @@ROWCOUNT as AffectedRows;
        `;

        const params = [{ name: 'id', value: id, type: sql.UniqueIdentifier }];
        const result = await executeQuery(query, params);

        if (result[0].AffectedRows === 0) {
            return res.status(404).json({
                status: 'Error',
                message: '通知不存在'
            });
        }

        res.json({
            status: 'Success',
            message: '通知删除成功'
        });
    } catch (error) {
        console.error('删除通知失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '删除通知失败'
        });
    }
});

module.exports = router;