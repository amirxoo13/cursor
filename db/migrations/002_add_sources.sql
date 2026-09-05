-- افزودن منابع جدید: HUDOC (ECHR)، EUAA Case Law، قوانین ملی کشورها (de_law و...)، EMN
ALTER TABLE legal_documents DROP CONSTRAINT IF EXISTS legal_documents_source_check;

ALTER TABLE legal_documents ADD CONSTRAINT legal_documents_source_check
  CHECK (source IN ('ecfr','federal_register','courtlistener','eurlex','hudoc','euaa','de_law','emn'));

-- برای قوانین ملی کشورهای عضو (مثل آلمان)، jurisdiction باید بتواند کد کشور
-- عضو را هم بپذیرد، نه فقط 'US'/'EU' فدرال.
ALTER TABLE legal_documents DROP CONSTRAINT IF EXISTS legal_documents_jurisdiction_check;

ALTER TABLE legal_documents ADD CONSTRAINT legal_documents_jurisdiction_check
  CHECK (jurisdiction IN ('US','EU','DE','FR','IT','ES','NL','AT','BE','SE'));
