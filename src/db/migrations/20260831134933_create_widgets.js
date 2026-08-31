exports.up = function(knex) {
  return knex.schema.createTable('widgets', (t) => {
    t.string('id').primary();
    t.string('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('title').notNullable();
    t.text('description');
    t.string('type').notNullable(); // signup_form | cta | popover
    t.json('fields').notNullable();
    t.string('button_text').defaultTo('Submit');
    t.json('display_options');
    t.integer('version').defaultTo(1);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.index('user_id');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('widgets');
};
