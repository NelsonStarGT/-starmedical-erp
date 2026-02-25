import type { PrismaClient } from "@prisma/client";

const PHONE_COUNTRY_CODES = [
  { iso2: "BZ", countryName: "Belize", dialCode: "+501", minLength: 7, maxLength: 7, example: "6221234" },
  { iso2: "GT", countryName: "Guatemala", dialCode: "+502", minLength: 8, maxLength: 8, example: "55551234" },
  { iso2: "SV", countryName: "El Salvador", dialCode: "+503", minLength: 8, maxLength: 8, example: "70123456" },
  { iso2: "HN", countryName: "Honduras", dialCode: "+504", minLength: 8, maxLength: 8, example: "91234567" },
  { iso2: "NI", countryName: "Nicaragua", dialCode: "+505", minLength: 8, maxLength: 8, example: "88881234" },
  { iso2: "CR", countryName: "Costa Rica", dialCode: "+506", minLength: 8, maxLength: 8, example: "88881234" },
  { iso2: "PA", countryName: "Panama", dialCode: "+507", minLength: 8, maxLength: 8, example: "61234567" },
  { iso2: "US", countryName: "United States", dialCode: "+1", minLength: 10, maxLength: 10, example: "3055551234" },
  { iso2: "MX", countryName: "Mexico", dialCode: "+52", minLength: 10, maxLength: 10, example: "5512345678" },
  { iso2: "CO", countryName: "Colombia", dialCode: "+57", minLength: 10, maxLength: 10, example: "3001234567" },
  { iso2: "EC", countryName: "Ecuador", dialCode: "+593", minLength: 9, maxLength: 9, example: "991234567" },
  { iso2: "PE", countryName: "Peru", dialCode: "+51", minLength: 9, maxLength: 9, example: "912345678" },
  { iso2: "BR", countryName: "Brazil", dialCode: "+55", minLength: 10, maxLength: 11, example: "11987654321" },
  { iso2: "AR", countryName: "Argentina", dialCode: "+54", minLength: 10, maxLength: 10, example: "1123456789" },
  { iso2: "PY", countryName: "Paraguay", dialCode: "+595", minLength: 9, maxLength: 9, example: "981234567" },
  { iso2: "UY", countryName: "Uruguay", dialCode: "+598", minLength: 8, maxLength: 9, example: "92123456" },
  { iso2: "GF", countryName: "French Guiana", dialCode: "+594", minLength: 9, maxLength: 9, example: "694201234" }
] as const;

export async function seedPhoneCountryCodes(prisma: PrismaClient) {
  for (const code of PHONE_COUNTRY_CODES) {
    await prisma.phoneCountryCode.upsert({
      where: { iso2: code.iso2 },
      update: {
        countryName: code.countryName,
        dialCode: code.dialCode,
        minLength: code.minLength,
        maxLength: code.maxLength,
        example: code.example,
        isActive: true
      },
      create: {
        iso2: code.iso2,
        countryName: code.countryName,
        dialCode: code.dialCode,
        minLength: code.minLength,
        maxLength: code.maxLength,
        example: code.example,
        isActive: true
      }
    });
  }
}
