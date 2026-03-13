const { MongoClient } = require('mongodb');

async function deleteNonSuperusers() {
    const uri = 'mongodb://localhost:27017';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const database = client.db('grandtelecom');
        const users = database.collection('users');

        // Superadmin olmayan bütün istifadəçiləri sil
        const result = await users.deleteMany({ 
            $or: [
                { role: { $ne: 'superadmin' } },
                { role: { $exists: false } } // role sahəsi olmayanları da sil
            ]
        });

        console.log('Nəticə:', result);
        console.log(`Toplam ${result.deletedCount} istifadəçi silindi.`);
        
        // Qalan istifadəçiləri göstər
        const remainingUsers = await users.find({}).toArray();
        console.log('Qalan istifadəçilər:', remainingUsers.map(u => u.username));
    } finally {
        await client.close();
    }
}

deleteNonSuperusers().catch(console.error);
