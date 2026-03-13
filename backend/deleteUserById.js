const { MongoClient, ObjectId } = require('mongodb');

async function deleteUserById() {
    const uri = 'mongodb://localhost:27017';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const database = client.db('grandtelecom');
        const users = database.collection('users');

        // Orxan istifadəçisini ID ilə sil
        const result = await users.deleteOne({ 
            _id: new ObjectId('68d7a25a913e8892b01bdea4')
        });

        console.log('Nəticə:', result);
        
        if (result.deletedCount > 0) {
            console.log('Orxan istifadəçisi ID ilə uğurla silindi.');
        } else {
            console.log('Bu ID ilə istifadəçi tapılmadı.');
        }
        
        // Qalan istifadəçiləri göstər
        const remainingUsers = await users.find({}).toArray();
        console.log('Qalan istifadəçilər:', remainingUsers.map(u => u.username));
    } finally {
        await client.close();
    }
}

deleteUserById().catch(console.error);
