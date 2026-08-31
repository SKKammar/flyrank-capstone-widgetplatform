const bcrypt = require('bcrypt');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Clear existing entries in reverse order of dependencies
  await knex('submissions').del();
  await knex('widgets').del();
  await knex('users').del();

  const passwordHash = await bcrypt.hash('Password123!', 10);
  const now = new Date();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  // 1. Create Users (RFC compliant UUID v4)
  const userAId = '11111111-1111-4111-8111-111111111111';
  const userBId = '22222222-2222-4222-8222-222222222222';

  await knex('users').insert([
    {
      id: userAId,
      email: 'user_a@example.com',
      password_hash: passwordHash,
      created_at: twoDaysAgo
    },
    {
      id: userBId,
      email: 'user_b@example.com',
      password_hash: passwordHash,
      created_at: twoDaysAgo
    }
  ]);

  // 2. Create Widgets (2 for User A, 1 for User B)
  const widgetA1Id = 'aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const widgetA2Id = 'aaaa2222-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const widgetB1Id = 'bbbb1111-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  await knex('widgets').insert([
    {
      id: widgetA1Id,
      user_id: userAId,
      title: 'Newsletter Signup',
      description: 'Subscribe to our weekly engineering blog updates',
      type: 'signup_form',
      fields: JSON.stringify([
        { name: 'email', type: 'email', required: true },
        { name: 'name', type: 'text', required: false }
      ]),
      button_text: 'Subscribe Now',
      display_options: JSON.stringify({ theme: 'dark', position: 'center' }),
      version: 1,
      created_at: twoDaysAgo,
      updated_at: twoDaysAgo
    },
    {
      id: widgetA2Id,
      user_id: userAId,
      title: 'Product Feedback',
      description: 'Tell us how we can improve FlyRank',
      type: 'cta',
      fields: JSON.stringify([
        { name: 'email', type: 'email', required: true },
        { name: 'feedback', type: 'textarea', required: true }
      ]),
      button_text: 'Send Feedback',
      display_options: JSON.stringify({ theme: 'light' }),
      version: 1,
      created_at: yesterday,
      updated_at: yesterday
    },
    {
      id: widgetB1Id,
      user_id: userBId,
      title: 'User B Consultation Form',
      description: 'Book an advisory call',
      type: 'popover',
      fields: JSON.stringify([
        { name: 'email', type: 'email', required: true },
        { name: 'phone', type: 'tel', required: false }
      ]),
      button_text: 'Schedule Call',
      display_options: JSON.stringify({ theme: 'blue' }),
      version: 1,
      created_at: yesterday,
      updated_at: yesterday
    }
  ]);

  // 3. Create Submissions
  await knex('submissions').insert([
    // Submissions for Widget A1 (User A)
    {
      id: 'cccc1111-1111-4ccc-8ccc-111111111111',
      widget_id: widgetA1Id,
      data: JSON.stringify({ email: 'subscriber1@gmail.com', name: 'Alice Smith' }),
      ip_address: '8.8.8.8',
      country: 'United States',
      city: 'Ashburn',
      region: 'Virginia',
      honeypot_triggered: false,
      created_at: twoDaysAgo
    },
    {
      id: 'cccc1111-1111-4ccc-8ccc-111111111112',
      widget_id: widgetA1Id,
      data: JSON.stringify({ email: 'subscriber2@yahoo.co.uk', name: 'Bob Jones' }),
      ip_address: '212.58.244.20',
      country: 'United Kingdom',
      city: 'London',
      region: 'England',
      honeypot_triggered: false,
      created_at: yesterday
    },
    {
      id: 'cccc1111-1111-4ccc-8ccc-111111111113',
      widget_id: widgetA1Id,
      data: JSON.stringify({ email: 'subscriber3@outlook.com', name: 'Charlie Brown' }),
      ip_address: '24.48.0.1',
      country: 'Canada',
      city: 'Montreal',
      region: 'Quebec',
      honeypot_triggered: false,
      created_at: now
    },
    // Submissions for Widget A2 (User A)
    {
      id: 'cccc2222-2222-4ccc-8ccc-222222222221',
      widget_id: widgetA2Id,
      data: JSON.stringify({ email: 'feedback1@corp.com', feedback: 'Loving the fast load times!' }),
      ip_address: '1.1.1.1',
      country: 'United States',
      city: 'San Francisco',
      region: 'California',
      honeypot_triggered: false,
      created_at: yesterday
    },
    // Submissions for Widget B1 (User B)
    {
      id: 'cccc3333-3333-4ccc-8ccc-333333333331',
      widget_id: widgetB1Id,
      data: JSON.stringify({ email: 'client1@paris.fr', phone: '+33123456789' }),
      ip_address: '195.154.122.1',
      country: 'France',
      city: 'Paris',
      region: 'Ile-de-France',
      honeypot_triggered: false,
      created_at: now
    }
  ]);
};
