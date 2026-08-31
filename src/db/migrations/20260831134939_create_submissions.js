exports.up = function(knex) {
  return knex.schema.createTable('submissions', (t) => {
    t.string('id').primary();
    t.string('widget_id').notNullable().references('id').inTable('widgets').onDelete('CASCADE');
    t.json('data').notNullable();
    t.string('ip_address');
    t.string('country');
    t.string('city');
    t.string('region');
    t.boolean('honeypot_triggered').defaultTo(false);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index('widget_id');
    t.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('submissions');
};
