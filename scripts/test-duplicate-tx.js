async function testDuplicates() {
  const payload = {
    serviceSlug: 'airtime-safaricom',
    destination: '0712345678',
    amount: 100,
    guestPhone: '0712345678',
    idempotencyKey: 'test-123'
  };

  console.log('Sending requests concurrently...');
  
  // We simulate what the frontend would do by hitting our API route if we wanted, 
  // but to test the orchestrator's duplicate guard, we can just hit the API endpoint.
  // Wait, let's hit our local API endpoint!
  
  const promises = [];
  for(let i=0; i<3; i++) {
    promises.push(
      fetch('http://localhost:4000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(res => res.text().then(data => ({ status: res.status, data })))
    );
  }

  const results = await Promise.all(promises);
  results.forEach((r, idx) => {
    console.log(`Request ${idx + 1}: Status ${r.status}`, r.data);
  });
}

testDuplicates().catch(console.error);
