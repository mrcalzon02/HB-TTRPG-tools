# Universal NPC Profile Generator — Initial Applicability Matrix

## Purpose

This matrix defines how the first-release archetypes interact with the canonical NPC profile sections. It is the Phase 0 source for the later rules engine and JSON schemas.

The matrix prevents the generator from filling every profile with the same generic fields. It also formalizes `None`, `Unknown`, and `Not applicable` as distinct outcomes.

## Policy Codes

- **R — Required:** the section must resolve to a usable value or a documented exceptional state.
- **O — Optional:** the section may be present, `None`, or `Unknown` according to context.
- **WN — Weighted None:** the section applies, but `None` is a common and explicitly weighted result.
- **UA — Unknown Allowed:** the section applies, but `Unknown` is a normal outcome.
- **S — Substitute:** the generic section is replaced by an archetype-specific section.
- **D — Derived:** the value is calculated from other profile data.
- **P — Prohibited:** the section must not appear unless an explicit exception or cover identity is generated.
- **NA — Not Applicable:** the section is structurally irrelevant and should normally be hidden from readable output.

## Canonical Section Matrix

| Section | Civilian | Laborer | Craft Worker | Merchant | Banker | Beggar | City Guard | Soldier | Thief | Bandit | Noble |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Identity | R | R | R | R | R | R | R | R | R | R | R |
| Ancestry / race | R | R | R | R | R | R | R | R | R | R | R |
| Age / age band | R | R | R | R | R | R | R | R | R | R | R |
| Physical description | O | O | O | O | O | O | O | O | O | O | O |
| Mechanical profile | O | O | O | O | O | O | R* | R* | O | R* | O |
| Occupation / role | O | R | R | R | R | R | R | R | R | R | R |
| Social class | O | D | D | D | D | D | D | D | D | D | R |
| Wealth band | O | D | D | D | D | D | D | D | D | D | D |
| Employment status | O | R | R | R | R | WN | R | R | WN | P | O |
| Employer | WN | O | O | O | R | WN | R | R | WN | P | O |
| Normal workplace | WN | O | R/WN | S | R | NA | S | S | P | P | S |
| Duty station | NA | NA | NA | NA | NA | NA | R | R/O | NA | NA | O |
| Operating area | O | O | O | R/O | O | R | O | O | R | R | O |
| Residence | O | O | O | O | O | WN | O | O | WN | S | R/O |
| Household | O | O | O | O | O | WN | O | O | WN | O | R |
| Family | O/UA | O/UA | O/UA | O/UA | O/UA | O/UA | O/UA | O/UA | O/UA | O/UA | R/UA |
| Education / training | O | O | R | O | R | O | R | R | O | O | R |
| Career history | O | O | R | R | R | O | R | R | O | O | R |
| Guild / union / order | WN | O | R/WN | O | O | NA | O | O | WN | P | O |
| Faction / organization | O | O | O | O | O | O | R/O | R | O | R | R |
| Rank / title | WN | WN | O | O | R | NA | R | R | WN | O | R |
| Supervisor / commander | WN | O | O | O | R/O | NA | R | R | O | R | O |
| Subordinates / staff | WN | WN | O | O | O | NA | O | O | O | O | R/O |
| Work tools | WN | R | R | O | O | WN | O | O | R | O | O |
| Weapons | WN | WN | WN | WN | WN | WN | R | R | O | R | O |
| Armor / protection | WN | WN | WN | WN | O | WN | R | R | WN | O/R | O |
| Legal status | O | O | O | O | O | O | R | R | R | R | R/O |
| Reputation | O | O | R/O | R | R | O | R | R | R | R | R |
| Debts / obligations | O | O | O | R/O | R/O | R/O | O | O | O | O | R/O |
| Immediate need | R | R | R | R | R | R | R | R | R | R | R |
| Long-term ambition | O | O | O | O | O | O | O | O | O | O | O |
| Fear | O | O | O | O | O | O | O | O | O | O | O |
| Loyalty | O | O | O | O | O | O | R | R | O | R | R |
| Moral boundary | O | O | O | O | O | O | O | O | O | O | O |
| Public problem | R | R | R | R | R | R | R | R | R | R | R |
| Secret | O/WN | O/WN | O/WN | O | O | O | O | O | R/O | O | R/O |
| Relationship hooks | O | O | O | O | O | O | O | O | O | O | R/O |
| Campaign hook | R | R | R | R | R | R | R | R | R | R | R |

`R*` means required only when mechanical generation is enabled. Narrative-only output remains valid.

# Specialized Section Substitutions

## Civilian

The generic workplace may resolve to:

- employer location;
- home-based work;
- irregular day-labor hiring point;
- unemployed;
- retired;
- caregiving or household labor;
- `None`.

## Laborer

The generic workplace should resolve to a work site, hiring point, crew, employer location, dock, warehouse, road project, mine, construction site, or rotating day-labor area.

Required specialized fields:

- labor type;
- employer or hiring method;
- work site;
- foreman or crew relationship;
- tools;
- pay stability;
- physical strain or hazard.

## Craft Worker

The generic workplace is replaced by `craftPractice`.

Required or conditional fields:

- trade;
- training standing;
- tools;
- workshop state;
- owner, employee, apprentice, itinerant, displaced, home-based, or unemployed status;
- guild or license state;
- materials source;
- current commission.

Workshop rules:

- `Present` for shop owner, workshop employee, guild shop, estate workshop, temple workshop, or military workshop.
- `None` for unemployed, itinerant, displaced, recently ruined, or tool-only work.
- `Unknown` when the NPC is encountered outside normal context.
- `Not applicable` only for an exceptional subtype whose craft does not use a stable work environment.

## Merchant

The generic workplace is replaced by `commercialOperation`.

Possible forms:

- permanent shop;
- market stall;
- warehouse office;
- caravan or wagon;
- shipboard trade operation;
- traveling pack trade;
- brokerage office;
- auction house;
- home-based trade;
- no current premises.

Required specialized fields:

- goods or services;
- market or route;
- suppliers;
- customers;
- capital band;
- current deal or shortage.

## Banker

The generic workplace is replaced by `financialOperation`.

Possible forms:

- chartered bank;
- merchant bank;
- guild treasury;
- temple treasury;
- noble household office;
- moneylending shop;
- partnership;
- traveling financier;
- criminal lender;
- independent private lender;
- displaced or ruined former institution.

Required specialized fields:

- institution or operating model;
- position;
- accessible capital;
- clients;
- loans or obligations;
- collateral practices;
- security;
- current financial risk.

A banker may not receive `None` for financial operation unless the background explicitly identifies them as retired, ruined, dismissed, imprisoned, displaced, or fraudulent.

## Beggar

The generic workplace is `Not applicable` and replaced by `streetTerritory`.

Required specialized fields:

- usual district, road, shrine, market, gate, dock, or gathering place;
- shelter or sleeping arrangement;
- cause of destitution;
- daily need;
- benefactor, informal network, or `None`;
- rival, threat, or authority pressure;
- visible or concealed resource.

Normal employer and normal business are weighted heavily toward `None`. A hidden employer, organized begging network, criminal handler, temple assignment, or information-broker role may be generated only as an explicit complication.

## City Guard

The generic workplace is replaced by `dutyAssignment`.

Required specialized fields:

- authority or employer;
- station, gate, post, barracks, or patrol office;
- jurisdiction;
- rank;
- shift;
- commander;
- patrol area or fixed post;
- issued equipment;
- current order;
- fatigue, corruption, loyalty, staffing, or public-relations pressure.

A city guard without a duty station must be explicitly off duty, suspended, dismissed, undercover, captured, deserted, traveling under orders, or reassigned.

## Soldier

The generic workplace is replaced by `militaryAssignment`.

Required specialized fields:

- military organization;
- unit;
- rank;
- specialty;
- commander;
- duty station or deployment;
- orders;
- service length;
- pay status;
- equipment issue;
- morale.

Unit may be `None` only when discharged, retired, deserted, captured, separated, missing, or operating as an independent remnant. The reason must be present.

## Thief

Normal workplace is prohibited and replaced by `criminalOperation`.

Required specialized fields:

- method;
- preferred targets;
- operating territory;
- fence or buyer, including `None`;
- safehouse, including `None`;
- tools;
- current score;
- heat or law pressure.

A shop, guild office, inn, or other normal workplace can appear only as a deliberate front business or legitimate secondary occupation.

## Bandit

Normal workplace and normal employer are prohibited and replaced by `outlawOperation`.

Required specialized fields:

- gang or solitary status;
- leader, self-command, or contested leadership;
- camp, mobile shelter, or `None`;
- territory;
- preferred ambush or raid area;
- target type;
- equipment;
- loot division;
- current target;
- pursuit, scarcity, betrayal, injury, or leadership pressure.

A former occupation may be present in background but must not be represented as current normal employment unless the bandit is using a cover identity.

## Noble

The generic workplace is replaced by `estateAndCourtRole`.

Required specialized fields:

- title or explicit title exception;
- noble house or explicit house exception;
- rank or social standing;
- succession position;
- estate, claim, office, court role, or dispossessed status;
- income source;
- household structure;
- obligations;
- political allies and rivals;
- current inheritance, marriage, debt, scandal, legitimacy, or faction problem.

A noble may lack an estate or recognized house only when the profile explicitly generates a dispossessed, exiled, illegitimate, fraudulent, foreign, hostage, newly elevated, or extinct-house condition.

# Absence-State Rules

## `None`

Use `None` when the section applies but the NPC has no such thing.

Examples:

- a craft worker currently has no workshop;
- a thief has no fence;
- a beggar has no permanent shelter;
- a civilian has no living siblings;
- a soldier has no spouse;
- a noble has no children.

## `Unknown`

Use `Unknown` when the answer may exist but is not known, remembered, disclosed, or established.

Examples:

- a refugee does not know whether a sibling survived;
- a foundling does not know their parents;
- a thief refuses to reveal a safehouse;
- a noble's biological parentage is disputed;
- a bandit does not know the gang's hidden patron.

## `Not applicable`

Use `Not applicable` when the field is structurally wrong for the archetype or current profile state.

Examples:

- normal business premises for a beggar;
- commercial employer for an independent bandit gang;
- guild workshop for a prisoner assigned forced labor;
- military rank for a civilian with no military background.

## Prohibited

A prohibited field is stronger than `Not applicable`. It must not appear unless an explicit exception path is generated.

Examples:

- a bandit receiving a normal current employer without a cover identity;
- a thief receiving a normal workplace without a legitimate secondary occupation or front;
- a prisoner receiving unrestricted employment;
- a child receiving adult children;
- a deceased relative remaining an active household resident.

# Cross-Field Dependency Rules

## Age and family

- Child: no spouse or children by default.
- Adolescent: spouse may be setting-dependent and rare; children should be rare and flagged by setting policy.
- Adult and middle-aged: all family structures available.
- Elderly: parents may be `None`, `Unknown`, deceased, or exceptionally living depending on ancestry longevity.
- Parent and child ages must remain plausible for the ancestry pack.
- Deceased, missing, estranged, and active household states must not conflict.

## Residence and household

- A household member should normally reference the same residence or an explicit separate location.
- Homeless or transient status should not silently produce home ownership.
- Barracks, prison, camp, ship, monastery, estate, and institutional residence should replace generic housing where appropriate.
- `None` residence means no stable residence, not absence of a current sleeping place.

## Employment and workplace

- Employed profiles require an employer, self-employment state, institution, contract, or explicit informal hiring model.
- Unemployed profiles may retain a former occupation.
- Retired profiles require a former occupation and support model or explicit destitution.
- Apprentices require a master, institution, employer, or unresolved placement problem.
- A workplace marked `None` must not generate staff, customers, or workshop security unless those belong to a former or mobile operation.

## Rank and organization

- Rank requires an organization or an explicit former, false, honorary, or disputed rank state.
- A commander requires subordinates or an explicit vacant, ceremonial, detached, or acting role.
- A noble title requires a granting authority, inheritance tradition, house, office, or explicit fraudulent/disputed condition.

## Wealth and possessions

- Wealth band influences residence, clothing, tools, security, transport, and carried money.
- Expensive equipment above the expected wealth band requires issue, loan, theft, inheritance, patronage, debt, or hidden-resource explanation.
- Destitute profiles may still possess one valuable item, but it should create a secret, danger, or contradiction explanation.

## Mechanical level and role

- Mechanical level is optional unless mechanical mode is enabled.
- Guard and soldier rank should broadly track level or experience, but exceptions are allowed for political appointment, veteran demotion, ceremonial rank, prodigy, or incompetent patronage.
- Noncombatant archetypes may have high narrative importance without high combat level.
- High-level beggars, laborers, or civilians require an explanatory background rather than automatic rejection.

# First Schema Translation

The Phase 1 schemas should represent applicability decisions in data rather than hard-coded UI branches.

Recommended structure:

```json
{
  "id": "marginalized-beggar",
  "parentId": "civilian-general",
  "sectionPolicies": {
    "workplace": {
      "policy": "not-applicable",
      "substituteSection": "streetTerritory"
    },
    "employer": {
      "policy": "weighted-none",
      "noneWeight": 95,
      "exceptionTags": [
        "organized-begging",
        "criminal-handler",
        "temple-service",
        "information-broker"
      ]
    },
    "residence": {
      "policy": "weighted-none",
      "noneWeight": 70,
      "substituteDetail": "sleepingPlace"
    }
  }
}
```

Readable output should omit generic not-applicable rows and display the substitute section under an archetype-appropriate label.

# Matrix Exit Condition

This matrix is sufficient for Phase 0 when every first-release archetype has documented required, optional, absent, substituted, and prohibited behavior for the major canonical profile sections, and the distinctions can be translated directly into Phase 1 schemas and fixtures.
