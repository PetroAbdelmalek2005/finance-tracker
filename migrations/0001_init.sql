CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  merchant TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('expense','income')),
  amount REAL NOT NULL,
  currency TEXT NOT NULL CHECK(currency IN ('CAD','USD','EUR','GBP')),
  notes TEXT,
  source TEXT,
  createdAt TEXT NOT NULL
);

CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category ON transactions(category);

CREATE TABLE categories (
  category TEXT PRIMARY KEY
);

INSERT INTO categories (category) VALUES
  ('Groceries'), ('Dining'), ('Transport'), ('Gas'), ('Housing'),
  ('Utilities'), ('Subscriptions'), ('Shopping'), ('Health'),
  ('Entertainment'), ('Travel'), ('Income'), ('Transfers'), ('Other');
