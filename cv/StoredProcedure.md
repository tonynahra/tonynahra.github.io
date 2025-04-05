##Survey Analysis
```sql
ALTER PROCEDURE [CP_Survey_Analysis] 
@ClientID smallint, 
@ModID varchar(10), 
@d1 smalldatetime, 
@d2 smalldatetime AS 
SELECT 
  TOP 100 PERCENT Activity_Responses.QuestionNumber, 
  Activity_Responses.UserResponse, 
  COUNT(Activity_Responses.Indx) AS cnt, 
  Module_Questions.Text AS Question, 
  Module_Answers.Text AS Reply, 
  Log_Activity.ClientID 
FROM 
  Activity_Responses 
  INNER JOIN Log_Activity ON Activity_Responses.ActivityIndex = Log_Activity.Indx 
  INNER JOIN Module_Info ON Log_Activity.ModuleID = Module_Info.ModuleID 
  INNER JOIN Module_Questions ON Activity_Responses.QuestionNumber = Module_Questions.Qcode 
  AND Module_Info.ModuleCODE = Module_Questions.ModuleCode 
  INNER JOIN Module_Answers ON Activity_Responses.QuestionNumber = Module_Answers.Qcode 
  AND Activity_Responses.UserResponse = Module_Answers.Answer 
  AND Module_Info.ModuleCODE = Module_Answers.ModuleCode 
WHERE 
  Activity_Responses.DT BETWEEN @d1 AND @d2 
GROUP BY 
  Activity_Responses.QuestionNumber, 
  Activity_Responses.UserResponse, 
  Module_Info.ModuleCODE, 
  Module_Questions.Text, 
  Module_Answers.Text, 
  Log_Activity.ClientID 
HAVING 
  Log_Activity.ClientID = @ClientID 
  AND Module_Info.ModuleCODE = @ModID 
ORDER BY 
  Activity_Responses.QuestionNumber, 
  Activity_Responses.UserResponse    
```

##LMS pulling licensed tutorials
```sql
USE [XPOL_070421] GO 
SET 
  ANSI_NULLS OFF GO 
SET 
  QUOTED_IDENTIFIER ON GO ALTER PROCEDURE [dbo].[CP_Admin_LM] @CID int, 
  @SpDest int, 
  @Type tinyint, 
  @FiltS int, 
  @FiltL Int, 
  @FiltK varchar(20) AS if @SpDest = -1 
SELECT 
  Module_Info.ModuleID, 
  dbo.Module_Info.ModuleCODE, 
  Module_Info.Lang, 
  (
    SELECT 
      moduleid 
    FROM 
      licensedmodules AS S 
    WHERE 
      S.clientid = @CID 
      AND Module_Info.moduleid = S.moduleid 
      AND S.Specialty = dbo.Specialties.SP
  ) AS Licensed, 
  dbo.Specialties.SPName as Specialty, 
  dbo.Module_Language.[Language], 
  dbo.Module_Info.Name as Module_Title, 
  Module_Type.M_Type AS Type, 
  @CID as ClientID, 
  dbo.Specialties.SP as DestSpecialty, 
  module_info.Name as Title, 
  module_info.Type as Type, 
  @CID as ClientID, 
  dbo.Specialties.SPname as DespSpecialty 
FROM 
  dbo.Module_Info 
  INNER JOIN dbo.Module_Specialty ON dbo.Module_Info.ModuleID = dbo.Module_Specialty.ModuleID 
  INNER JOIN dbo.Module_Type ON dbo.Module_Info.Type = Module_Type.Indx 
  INNER JOIN dbo.Specialties Spe ON dbo.Module_Info.Specialty = Spe.SP 
  INNER JOIN dbo.Module_Language ON dbo.Module_Info.Lang = dbo.Module_Language.Indx 
  INNER JOIN dbo.Specialties ON dbo.Module_Specialty.Specialty = dbo.Specialties.SP 
WHERE 
  (dbo.Module_Info.ModuleCODE = @FiltK) 
  and (dbo.Module_Info.Status <> 3) else if @SpDest =-2 
SELECT 
  TOP 100 PERCENT M.ModuleID AS ModuleID, 
  M.ModuleCODE, 
  M.Lang, 
  1 AS Licensed, 
  Specialties_1.SPName AS Specialty, 
  dbo.Module_Language.[Language], 
  M.Name AS Module_Title, 
  MT.M_Type AS asType, 
  dbo.LicensedModules.ClientID, 
  Specialties_1.SP AS DestSpecialty 
FROM 
  dbo.Module_Info M 
  INNER JOIN dbo.Module_Language ON M.Lang = dbo.Module_Language.Indx 
  INNER JOIN dbo.Module_Type MT ON M.Type = MT.Indx 
  INNER JOIN dbo.Specialties Spe ON M.Specialty = Spe.SP 
  INNER JOIN dbo.LicensedModules ON M.ModuleID = dbo.LicensedModules.ModuleID 
  INNER JOIN dbo.Specialties Specialties_1 ON dbo.LicensedModules.Specialty = Specialties_1.SP 
WHERE 
  (
    M.Type = ISNULL(@Type, M.Type)
  ) 
  AND (M.Status <> 3) 
  AND (
    dbo.LicensedModules.ClientID = @CID
  ) 
  and M.Specialty = isnull(@FiltS, M.Specialty) 
  and M.[Lang] = isnull(@FiltL, M.[Lang]) 
  and M.ModuleCode + M.Name + M.keywords like '%' + isnull(@FiltK, '%') + '%' 
ORDER BY 
  M.Sorting, 
  M.Name else 
SELECT 
  TOP 100 PERCENT M.ModuleID AS ModuleID, 
  M.ModuleCODE, 
  M.Lang, 
  (
    SELECT 
      moduleid 
    FROM 
      licensedmodules AS S 
    WHERE 
      S.clientid = @CID 
      AND M.moduleid = S.moduleid 
      AND S.Specialty = @SpDest
  ) AS Licensed, 
  Spe.SPname as Specialty, 
  dbo.Module_Language.[Language], 
  M.Name as Module_Title, 
  MT.M_Type asType, 
  @CID as ClientID, 
  Spe.SP AS DestSpecialty 
FROM 
  dbo.Module_Info M 
  INNER JOIN dbo.Module_Language ON M.Lang = dbo.Module_Language.Indx 
  inner join module_type as MT on M.Type = MT.Indx 
  inner join Specialties as Spe on M.Specialty = Spe.SP 
where 
  M.Type = isnull(@Type, M.Type) 
  and (M.Status <> 3) 
  and M.Specialty = isnull(@FiltS, M.Specialty) 
  and M.[Lang] = isnull(@FiltL, M.[Lang]) 
  and M.ModuleCode + M.Name + M.keywords like '%' + isnull(@FiltK, '%') + '%' 
ORDER BY 
  M.Sorting, 
  M.Name
```
