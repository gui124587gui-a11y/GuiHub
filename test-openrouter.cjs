
const { OpenRouter } = require('@openrouter/sdk');

// Test with the key the user just provided
const apiKey = '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';
console.log('Testing API Key:', apiKey);

const test = async () => {
  try {
    const openrouter = new OpenRouter({ apiKey });
    console.log('Calling OpenRouter with SDK...');

    const result = await openrouter.chat.send({
      chatRequest: {
        model: 'openai/gpt-oss-20b:free',
        messages: [
          { role: 'system', content: 'Test' },
          { role: 'user', content: 'Hello' }
        ]
      }
    });

    console.log('Response:', result);
    console.log('Content:', result.choices[0].message.content);
  } catch (err) {
    console.error('Error:', err);
  }
};

test();
