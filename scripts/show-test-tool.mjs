const res = await fetch('https://api.elevenlabs.io/v1/convai/tools', {
  headers: { 'xi-api-key': 'sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68' }
});
const data = await res.json();
console.log("First tool structure:");
console.log(JSON.stringify(data.tools[0], null, 2));
