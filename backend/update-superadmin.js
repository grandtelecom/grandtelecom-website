#!/usr/bin/env node
/**
 * Superadmin credentials yeniləmə
 * İstifadə:
 *   node update-superadmin.js --username "YeniAd" --password "Sifre1!"
 *   node update-superadmin.js --password "Sifre1!"
 *   node update-superadmin.js --username "YeniAd"
 */

require('dotenv').config();

const fs     = require('fs-extra');
const path   = require('path');
const bcrypt = require('bcryptjs');

const USERS_FILE = path.join(__dirname, 'data', 'users.json');

function parseArgs() {
    const args = {};
    const argv = process.argv.slice(2);
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--username' && argv[i + 1]) args.username = argv[++i];
        if (argv[i] === '--password' && argv[i + 1]) args.password = argv[++i];
    }
    return args;
}

async function main() {
    const { username, password } = parseArgs();

    if (!username && !password) {
        console.log('İstifadə:');
        console.log('  node update-superadmin.js --username "YeniAd" --password "Sifre1!"');
        console.log('  node update-superadmin.js --password "Sifre1!"');
        console.log('  node update-superadmin.js --username "YeniAd"');
        process.exit(0);
    }

    const users      = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const superadmin = users.find(u => u.role === 'superadmin');

    if (!superadmin) {
        console.error('XETA: Superadmin tapilmadi.');
        process.exit(1);
    }

    if (password) {
        const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
        if (!re.test(password)) {
            console.error('XETA: Sifre telibleri: 8+ simvol, boyuk+kicik herf, reqem, xususi simvol.');
            process.exit(1);
        }
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
        superadmin.passwordHash = await bcrypt.hash(password, saltRounds);
        superadmin.salt = null;
        console.log('Sifre: yenilendi');
    }

    if (username) {
        const conflict = users.find(u =>
            u.username.toLowerCase() === username.toLowerCase() && u._id !== superadmin._id
        );
        if (conflict) {
            console.error('XETA: "' + username + '" artiq movcuddur.');
            process.exit(1);
        }
        superadmin.username = username;
        console.log('Username: ' + username);
    }

    superadmin.updatedAt = new Date().toISOString();

    const tmp = USERS_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(users, null, 2), 'utf8');
    fs.renameSync(tmp, USERS_FILE);

    console.log('UGURLU: Superadmin yenilendi!');
}

main().catch(err => {
    console.error('Xeta:', err.message);
    process.exit(1);
});
