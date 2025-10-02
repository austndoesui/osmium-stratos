const readline = require('readline');
const axios = require('axios');
const bcrypt = require('bcrypt');
const inquirer = require('inquirer');

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

function isValidEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

async function main() {
  try {
    const username = await prompt('Username: ');
    let email = '';
    while (true) {
      email = await prompt('Email: ');
      if (isValidEmail(email)) break;
      console.log('Please enter a valid email address.');
    }
    const password = await prompt('Password: ');
    const { role } = await inquirer.prompt([
      {
        type: 'list',
        name: 'role',
        message: 'Select user role:',
        choices: [
          { name: 'Admin', value: 'admin' },
          { name: 'User', value: 'user' }
        ],
        default: 'user'
      }
    ]);
    const password_hash = await bcrypt.hash(password, 10);
    const res = await axios.post('http://localhost:3000/api/register', {
      username,
      email,
      password_hash,
      role
    });
    if (res.data && res.data.success) {
      console.log('✅ User created successfully!');
      console.log(`   Username: ${res.data.username}`);
      console.log(`   Email: ${res.data.email}`);
      console.log(`   Role: ${res.data.role}`);
    } else {
      console.error('❌ Failed to create user:', res.data.error || 'Unknown error');
    }
  } catch (e) {
    if (e.code === 'ECONNREFUSED' || (e.cause && e.cause.code === 'ECONNREFUSED')) {
      console.error('❌ Osmium backend server is not running. Please start it to continue with this operation.');
      return;
    }
    if (e.response) {
      console.error(`❌ Registration failed: ${e.response.status} ${e.response.statusText}`);
      if (e.response.data && e.response.data.error) {
        console.error(`   Error: ${e.response.data.error}`);
      }
    } else {
      console.error(`❌ Error: ${e.message}`);
    }
  }
}

if (require.main === module) {
  main();
}
