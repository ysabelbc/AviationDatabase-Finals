# Data Dictionary — `PersonINFO`

Legend: **PK** = Primary Key · **FK** = Foreign Key · `IDENTITY` = auto-increment.
All string columns are `NVARCHAR` (Unicode). Optional columns allow `NULL`.

---

## Lookup / Reference Tables

### Campus
| Column | Type | Key | Notes |
|---|---|---|---|
| CampusID | INT IDENTITY | PK | Auto number |
| GenID | INT | | Unused legacy column |
| CampusName | NVARCHAR(100) | | Required |

### Semester
| Column | Type | Key | Notes |
|---|---|---|---|
| SemID | INT IDENTITY | PK | |
| GenID | INT | | Unused legacy column |
| SemNo | NVARCHAR(20) | | e.g. "1st Semester" |

### Program
| Column | Type | Key | Notes |
|---|---|---|---|
| ProgramID | INT IDENTITY | PK | |
| GenID | INT | | Unused legacy column |
| ProgramName | NVARCHAR(50) | | Degree program |

### Region
| Column | Type | Key | Notes |
|---|---|---|---|
| RegionID | INT IDENTITY | PK | |
| GenID | INT | | Unused legacy column |
| RegionName | NVARCHAR(50) | | PH administrative region |

### Religion
| Column | Type | Key | Notes |
|---|---|---|---|
| ReligionID | INT IDENTITY | PK | |
| GenID | INT | | Unused legacy column |
| ReligionName | NVARCHAR(50) | | |

### AcademicYear
| Column | Type | Key | Notes |
|---|---|---|---|
| AcadYearID | INT IDENTITY | PK | |
| GenID | INT | | Unused legacy column |
| AcadYear | NVARCHAR(20) | | e.g. "2024-2025" |

### Sex
| Column | Type | Key | Notes |
|---|---|---|---|
| SexID | INT IDENTITY | PK | |
| GenID | INT | | Unused legacy column |
| SexName | NVARCHAR(10) | | Male / Female |

### Civil_Status
| Column | Type | Key | Notes |
|---|---|---|---|
| CStatusID | INT IDENTITY | PK | |
| GenID | INT | | Unused legacy column |
| StatusName | NVARCHAR(30) | | Single / Married / … |

### Residence
| Column | Type | Key | Notes |
|---|---|---|---|
| ResidenceID | INT IDENTITY | PK | |
| GenID | INT | | Unused legacy column |
| ResiName | NVARCHAR(50) | | Living situation |

### Marital
| Column | Type | Key | Notes |
|---|---|---|---|
| MaritalID | INT IDENTITY | PK | Parents' marital status |
| FamID | INT | | Unused legacy column |
| MartialName | NVARCHAR(50) | | |
| is_active | BIT | | Default 1 |

### Living_Arrangement
| Column | Type | Key | Notes |
|---|---|---|---|
| LivingID | INT IDENTITY | PK | |
| FamID | INT | | Unused legacy column |
| LivingName | NVARCHAR(50) | | |
| is_active | BIT | | Default 1 |

### House_Income
| Column | Type | Key | Notes |
|---|---|---|---|
| HouseIncome | INT IDENTITY | PK | (PK column name is `HouseIncome`) |
| FamID | INT | | Unused legacy column |
| IncomeName | NVARCHAR(50) | | Monthly income bracket |
| is_active | BIT | | Default 1 |

---

## General_Information (central student record)
| Column | Type | Key | Notes |
|---|---|---|---|
| GenID | INT IDENTITY | PK | Student record id |
| CampusID | INT | FK→Campus | Required |
| SemID | INT | FK→Semester | |
| ProgramID | INT | FK→Program | Required |
| AcadYearID | INT | FK→AcademicYear | |
| StudentNo | NVARCHAR(20) | | School student number |
| YearSec | NVARCHAR(20) | | e.g. "1-A" |
| LName / FName / MName | NVARCHAR(100) | | FName & LName required |
| Nickname | NVARCHAR(100) | | |
| Age | INT | | |
| SexID | INT | FK→Sex | |
| CivilStatusID | INT | FK→Civil_Status | |
| ReligionID | INT | FK→Religion | |
| Birthday | DATE | | |
| Birthplace | NVARCHAR(150) | | |
| Citizenship | NVARCHAR(50) | | |
| RegionID | INT | FK→Region | |
| LanguageSpoken | NVARCHAR(200) | | |
| Indigenous | NVARCHAR(100) | | IP group, if any |
| ResidenceID | INT | FK→Residence | |
| PresentAdd / PermanentAdd | NVARCHAR(255) | | |
| Contact | NVARCHAR(20) | | |
| Email | NVARCHAR(100) | | |
| Link | NVARCHAR(255) | | Social link |

---

## Family_Background
| Column | Type | Key | Notes |
|---|---|---|---|
| FamID | INT IDENTITY | PK | |
| GenID | INT | FK→General_Information | Required |
| MaritalID | INT | FK→Marital | Parents' status |
| LivingID | INT | FK→Living_Arrangement | |
| LivingArrangementOther | NVARCHAR(100) | | Free text if "Others" |
| FName…Fcontact | various | | Father details |
| FatherDeceased | BIT | | Default 0 |
| Mname…Mcontact | various | | Mother details |
| MotherDeceased | BIT | | Default 0 |
| LGName / LGRelationship / LGContact / LGAddress | | | Legal guardian |
| NumofSibs | INT | | Number of siblings |
| Birthorder | INT | | |
| HouseIncomeID | INT | FK→House_Income | |
| HouseNo | NVARCHAR(50) | | |
| Is4PsMember | BIT | | Default 0 |
| DSWDHouseholdNo | NVARCHAR(50) | | |
| Finance | NVARCHAR(100) | | Who finances studies |
| Spousename / Scontact / Skids | | | If student is married |
| Ssoloparent | BIT | | Default 0 |

## Siblings
| Column | Type | Key | Notes |
|---|---|---|---|
| SiblingID | INT IDENTITY | PK | |
| FamID | INT | FK→Family_Background | Required |
| SibName / SibAge / SibOccupation / SibSC / SibContact | | | Sibling details |

---

## Educational_Background
| Column | Type | Key | Notes |
|---|---|---|---|
| EducID | INT IDENTITY | PK | |
| GenID | INT | FK→General_Information | Required |
| Elem* (Name/Add/Year/Track/Type) | | | Elementary |
| JH* | | | Junior High |
| SH* | | | Senior High |
| College* | | | College |
| Awards | NVARCHAR(255) | | |
| Scholar | NVARCHAR(255) | | Scholarship |
| CEmployed | BIT | | Currently employed, default 0 |
| Employer / Since | | | |

---

## Extracurricular
| Column | Type | Key | Notes |
|---|---|---|---|
| ExtraID | INT IDENTITY | PK | |
| GenID | INT | FK→General_Information | Required |
| SOAID / COAID | INT | | Legacy pointer columns |

### School_Organization
| Column | Type | Key | Notes |
|---|---|---|---|
| SOAID | INT IDENTITY | PK | |
| ExtraID | INT | FK→Extracurricular | Required |
| SOrgName / SPosition / SYear | | | |

### Community_Organization
| Column | Type | Key | Notes |
|---|---|---|---|
| COAID | INT IDENTITY | PK | |
| ExtraID | INT | FK→Extracurricular | Required |
| COrgName / CPosition / CYear | | | |

---

## Medical_Information
| Column | Type | Key | Notes |
|---|---|---|---|
| MedID | INT IDENTITY | PK | |
| GenID | INT | FK→General_Information | Required |
| Height | DECIMAL(4,2) | | meters |
| Weight | DECIMAL(5,2) | | kg |
| PWD | BIT | | Default 0 |
| Disability / PWDNo | | | |
| Experience | NVARCHAR(255) | | Past surgery / medical experience |
| Chronic | NVARCHAR(255) | | Chronic condition |
| Therapy | BIT | | Default 0 |
| [When] | NVARCHAR(50) | | (reserved word — bracketed) |
| MPCondition | NVARCHAR(255) | | Mental health condition |
| TakingMed | NVARCHAR(255) | | |

### Medication
| Column | Type | Key | Notes |
|---|---|---|---|
| MedicationID | INT IDENTITY | PK | |
| MedID | INT | FK→Medical_Information | Required |
| MedName / Dosage / Frequency | | | |

---

## Other_Information
| Column | Type | Key | Notes |
|---|---|---|---|
| OtherID | INT IDENTITY | PK | |
| GenID | INT | FK→General_Information | Required |
| Sinterest / Skill / Hobbies / Ambition / Motto | | | |
| DistinctPT | NVARCHAR(255) | | Distinct personal trait |
| EResult | NVARCHAR(30) | | Entrance exam result |
| LatestGPA | DECIMAL(4,2) | | |
| Signature | NVARCHAR(150) | | |
| DateFiled | DATE | | |

---

## UserAccount (login layer — added for Pink Horizon Academy)
| Column | Type | Key | Notes |
|---|---|---|---|
| UserID | INT IDENTITY | PK | |
| GenID | INT | FK→General_Information, **UNIQUE** | One account per student |
| Username | NVARCHAR(60) | **UNIQUE** | Login name |
| PasswordHash | NVARCHAR(255) | | bcrypt hash (never plain text) |
| Role | NVARCHAR(20) | | `student` (default) or `admin` |
| CreatedAt | DATETIME | | Default `GETDATE()` |
| IsActive | BIT | | Default 1 |

> Created by `sql/01_add_useraccount.sql`. Adds authentication on top of the original schema
> without modifying any existing table.
