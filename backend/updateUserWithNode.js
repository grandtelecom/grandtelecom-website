const { MongoClient } = require('mongodb');

async function updateUser() {
    const uri = 'mongodb://localhost:27017';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const database = client.db('grandtelecom');
        const users = database.collection('users');

        const result = await users.updateOne(
            { username: 'Timur' },
            {
                $set: {
                    role: 'superadmin',
                    password: '$2b$10$AWYCiD89G2MiZkAJJZHOtuU04IUYtWoB5JFz.oAxP3nvPt9ggMXbSm',
                    createdAt: new Date()
                }
            },
            { upsert: true }
        );

        console.log('Nəticə:', result);
        console.log('Timur istifadəçisi uğurla yaradılıb/yeniləndi!');
    } finally {
        await client.close();
    }
}

updateUser().catch(console.error);
