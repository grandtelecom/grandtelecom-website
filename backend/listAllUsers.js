const { MongoClient } = require('mongodb');

async function listAllUsers() {
    const uri = 'mongodb://localhost:27017';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const database = client.db('grandtelecom');
        const users = database.collection('users');
        
        // Bütün istifadəçiləri göstər
        const allUsers = await users.find({}).toArray();
        
        console.log('Bütün istifadəçilər:');
        console.log(JSON.stringify(allUsers, null, 2));
        
        console.log('\nİstifadəçi sayı:', allUsers.length);
        
    } finally {
        await client.close();
    }
}

listAllUsers().catch(console.error);
