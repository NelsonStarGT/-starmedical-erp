import assert from "node:assert/strict";
import test from "node:test";
import {
  createSyntheticPhoneOption,
  resolvePreferredPhoneIso2,
  type GeoCountryPhoneHint,
  type PhoneCountryOptionWithGeo
} from "@/lib/phone/preferredCountry";

const PHONE_OPTIONS: PhoneCountryOptionWithGeo[] = [
  {
    id: "phone_gt",
    iso2: "GT",
    countryName: "Guatemala",
    dialCode: "+502",
    minLength: 8,
    maxLength: 8,
    geoCountryId: "geo_gt",
    isActive: true
  },
  {
    id: "phone_ar",
    iso2: "AR",
    countryName: "Argentina",
    dialCode: "+54",
    minLength: 10,
    maxLength: 10,
    geoCountryId: "geo_ar",
    isActive: true
  }
];

test("resolvePreferredPhoneIso2 prioritizes geoCountryId mapping", () => {
  const iso2 = resolvePreferredPhoneIso2(PHONE_OPTIONS, {
    preferredGeoCountryId: "geo_gt"
  });

  assert.equal(iso2, "GT");
});

test("resolvePreferredPhoneIso2 falls back to geo hint when phone option has no geoCountryId", () => {
  const optionsWithoutGeo = PHONE_OPTIONS.map((item) => ({ ...item, geoCountryId: null }));
  const hints = new Map<string, GeoCountryPhoneHint>([
    [
      "geo_gt",
      {
        id: "geo_gt",
        code: "GT",
        name: "Guatemala",
        callingCode: "+502"
      }
    ]
  ]);

  const iso2 = resolvePreferredPhoneIso2(optionsWithoutGeo, {
    preferredGeoCountryId: "geo_gt",
    geoCountryHintsById: hints
  });

  assert.equal(iso2, "GT");
});

test("createSyntheticPhoneOption uses fallback dial code when preferred country is missing in phone catalog", () => {
  const hints = new Map<string, GeoCountryPhoneHint>([
    [
      "geo_gt",
      {
        id: "geo_gt",
        code: "GT",
        name: "Guatemala",
        callingCode: null
      }
    ]
  ]);

  const synthetic = createSyntheticPhoneOption(
    PHONE_OPTIONS.filter((item) => item.iso2 !== "GT"),
    {
      preferredIso2: "GT",
      preferredGeoCountryId: "geo_gt",
      geoCountryHintsById: hints
    }
  );

  assert.ok(synthetic);
  assert.equal(synthetic?.iso2, "GT");
  assert.equal(synthetic?.dialCode, "+502");
});

test("createSyntheticPhoneOption returns null when preferred country already exists", () => {
  const synthetic = createSyntheticPhoneOption(PHONE_OPTIONS, {
    preferredIso2: "AR",
    preferredGeoCountryId: "geo_ar"
  });

  assert.equal(synthetic, null);
});
