DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'ClientCatalogType' AND e.enumlabel = 'PERSON_CATEGORY'
  ) THEN
    ALTER TYPE "ClientCatalogType" ADD VALUE 'PERSON_CATEGORY';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'ClientCatalogType' AND e.enumlabel = 'PERSON_PROFESSION'
  ) THEN
    ALTER TYPE "ClientCatalogType" ADD VALUE 'PERSON_PROFESSION';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'ClientCatalogType' AND e.enumlabel = 'COMPANY_CATEGORY'
  ) THEN
    ALTER TYPE "ClientCatalogType" ADD VALUE 'COMPANY_CATEGORY';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'ClientCatalogType' AND e.enumlabel = 'INSTITUTION_CATEGORY'
  ) THEN
    ALTER TYPE "ClientCatalogType" ADD VALUE 'INSTITUTION_CATEGORY';
  END IF;
END $$;
