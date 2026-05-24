async function test() {
  try {
    const csrfRes = await fetch('http://127.0.0.1:3000/api/v1/csrf-token');
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.data.csrfToken;
    const cookie = csrfRes.headers.get('set-cookie');
    
    const loginRes = await fetch('http://127.0.0.1:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken, 'Cookie': cookie },
      body: JSON.stringify({ username: 'superadmin', password: 'Admin@SecurePass123' })
    });
    
    const loginData = await loginRes.json();
    if (!loginData.success) {
      console.error('Login failed', loginData);
      return;
    }
    
    const token = loginData.data.token;
    const endpoints = ['/api/v1/regions', '/api/v1/districts', '/api/v1/polling-stations'];
    
    for (const ep of endpoints) {
      console.log(`\nTesting ${ep}...`);
      const res = await fetch(`http://127.0.0.1:3000${ep}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const text = await res.text();
      console.log(`Status: ${res.status}`);
      console.log(`Body: ${text.substring(0, 500)}`);
    }
  } catch (err) {
    console.error(err);
  }
}

test();
