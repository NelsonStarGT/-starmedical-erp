import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCallingCode,
  parseAdmin1Codes,
  parseAdmin2Codes,
  parseCountryInfo,
  TARGET_ISO2
} from "@/scripts/geo/import-geonames";

test("normalizeCallingCode normaliza prefijos de GeoNames", () => {
  assert.equal(normalizeCallingCode("502"), "+502");
  assert.equal(normalizeCallingCode("1, 1-684"), "+1");
  assert.equal(normalizeCallingCode("1-809 and 1-829"), "+1");
  assert.equal(normalizeCallingCode(""), null);
});

test("parseCountryInfo filtra solo paises objetivo", () => {
  const text = [
    "#ISO\tISO3\tISONumeric\tfips\tCountry\tCapital\tArea\tPopulation\tContinent\ttld\tCurrency\tCurrencyName\tPhone",
    "GT\tGTM\t320\tGT\tGuatemala\tGuatemala City\t108890\t17700000\tNA\t.gt\tGTQ\tQuetzal\t502",
    "US\tUSA\t840\tUS\tUnited States\tWashington\t9629091\t331000000\tNA\t.us\tUSD\tDollar\t1",
    "GY\tGUY\t328\tGY\tGuyana\tGeorgetown\t214969\t790000\tSA\t.gy\tGYD\tDollar\t592",
    "GF\tGUF\t254\tFG\tFrench Guiana\tCayenne\t83534\t300000\tSA\t.gf\tEUR\tEuro\t594",
    "FR\tFRA\t250\tFR\tFrance\tParis\t640679\t67000000\tEU\t.fr\tEUR\tEuro\t33"
  ].join("\n");

  const rows = parseCountryInfo(text);
  assert.equal(rows.length, 4);
  assert.equal(rows[0]?.iso2, "GT");
  assert.equal(rows[0]?.callingCode, "+502");
  assert.equal(rows[1]?.iso2, "US");
  assert.equal(rows[2]?.iso2, "GY");
  assert.equal(rows[3]?.iso2, "GF");
});

test("TARGET_ISO2 incluye america completa definida por negocio", () => {
  const expected = [
    "US",
    "CA",
    "MX",
    "BZ",
    "GT",
    "SV",
    "HN",
    "NI",
    "CR",
    "PA",
    "CU",
    "DO",
    "HT",
    "JM",
    "PR",
    "TT",
    "CO",
    "EC",
    "PE",
    "BR",
    "AR",
    "PY",
    "UY",
    "BO",
    "CL",
    "VE",
    "GY",
    "SR",
    "GF"
  ];
  assert.deepEqual([...TARGET_ISO2], expected);
});

test("parseAdmin1Codes y parseAdmin2Codes generan codigos jerarquicos", () => {
  const admin1Text = [
    "GT.01\tAlta Verapaz\tAlta Verapaz\t3595528",
    "US.CA\tCalifornia\tCalifornia\t5332921",
    "FR.11\tIle-de-France\tIle-de-France\t3012874"
  ].join("\n");

  const admin2Text = [
    "GT.01.1601\tCoban\tCoban\t3598114",
    "US.CA.001\tAlameda County\tAlameda County\t5322737",
    "DE.16.091\tHof\tHof\t6556498"
  ].join("\n");

  const admin1 = parseAdmin1Codes(admin1Text);
  const admin2 = parseAdmin2Codes(admin2Text);

  assert.equal(admin1.length, 2);
  assert.equal(admin1[0]?.iso2, "GT");
  assert.equal(admin1[0]?.admin1Code, "01");
  assert.equal(admin1[1]?.iso2, "US");

  assert.equal(admin2.length, 2);
  assert.equal(admin2[0]?.iso2, "GT");
  assert.equal(admin2[0]?.admin1Code, "01");
  assert.equal(admin2[0]?.admin2Code, "1601");
  assert.equal(admin2[1]?.iso2, "US");
  assert.equal(admin2[1]?.admin2Code, "001");
});
