// A Map is a great way to store key-value pairs and easily look up items by their ID.
const items = new Map();

items.set('fishing_rod', {
    id: 'fishing_rod',
    name: 'Sturdy Fishing Rod',
    price: 1500,
    description: 'A reliable fishing rod. Might help you catch something valuable!',
});

items.set('vip_role', {
    id: 'vip_role',
    name: 'VIP Role Access',
    price: 25000,
    description: 'Grants you the special "VIP" role in the server, with a custom color and access to secret channels!',
    roleId: '1398749757211541534' // IMPORTANT: Replace with a real Role ID from your server
});

items.set('rare_gem', {
    id: 'rare_gem',
    name: 'Shimmering Gem',
    price: 5000,
    description: 'A beautiful, rare gem. Doesn\'t do anything, but it proves you\'re rich!',
});


module.exports = { items };