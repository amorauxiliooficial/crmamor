-- Add CPF validation function and constraint

-- First, create the validation function
CREATE OR REPLACE FUNCTION public.validate_cpf(cpf TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  clean_cpf TEXT;
  sum1 INT := 0;
  sum2 INT := 0;
  check1 INT;
  check2 INT;
  i INT;
BEGIN
  -- Remove formatting (dots, dashes, spaces)
  clean_cpf := regexp_replace(cpf, '[^0-9]', '', 'g');
  
  -- Check length
  IF length(clean_cpf) != 11 THEN RETURN FALSE; END IF;
  
  -- Check for known invalid patterns (all same digit)
  IF clean_cpf ~ '^(\d)\1{10}$' THEN RETURN FALSE; END IF;
  
  -- Calculate first check digit
  FOR i IN 1..9 LOOP
    sum1 := sum1 + (substring(clean_cpf, i, 1)::INT * (11 - i));
  END LOOP;
  
  check1 := 11 - (sum1 % 11);
  IF check1 >= 10 THEN check1 := 0; END IF;
  IF check1 != substring(clean_cpf, 10, 1)::INT THEN RETURN FALSE; END IF;
  
  -- Calculate second check digit
  FOR i IN 1..10 LOOP
    sum2 := sum2 + (substring(clean_cpf, i, 1)::INT * (12 - i));
  END LOOP;
  
  check2 := 11 - (sum2 % 11);
  IF check2 >= 10 THEN check2 := 0; END IF;
  IF check2 != substring(clean_cpf, 11, 1)::INT THEN RETURN FALSE; END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path = public;

-- Add constraint for CPF format (11 digits only, after removing formatting)
ALTER TABLE public.mae_processo 
ADD CONSTRAINT cpf_format_check 
CHECK (regexp_replace(cpf, '[^0-9]', '', 'g') ~ '^[0-9]{11}$');