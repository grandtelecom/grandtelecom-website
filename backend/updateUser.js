db = db.getSiblingDB('grandtelecom');

db.users.updateOne(
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

print('Timur istifadəçisi uğurla yaradılıb/yeniləndi!');
