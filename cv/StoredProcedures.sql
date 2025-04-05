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
