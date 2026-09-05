-- افزودن منابع قوانین ملی هلند و اسپانیا
ALTER TABLE legal_documents DROP CONSTRAINT IF EXISTS legal_documents_source_check;

ALTER TABLE legal_documents ADD CONSTRAINT legal_documents_source_check
  CHECK (source IN ('ecfr','federal_register','courtlistener','eurlex','hudoc','euaa','de_law','emn','nl_law','es_law'));
