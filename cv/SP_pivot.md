```sql
/*
Pivot Table stored procedure

Description:
Generates simple pivot tables on data, and outputs the final SQL statement via Print

For example, given data as shown below:

ID          year        type        amt         
----------- ----------- ----------- ----------- 
7           1999        1           23
8           1999        2           44
9           1999        3           55
10          2000        1           66
11          2000        2           77
12          2000        3           88
13	1999	 1	 11


... you can pivot the data to show the years down the side 
and the types across the top...

year        1           2           3           RowTotal    
----------- ----------- ----------- ----------- ----------- 
1999        34          44          55          133
2000        66          77          88          231


... and get the SQL which would produce this table
	SELECT Pivot_Data.*, 
	 (Pivot_Data.[1] + Pivot_Data.[2] + Pivot_Data.[3]) AS RowTotal 
	FROM (SELECT [year],  
	SUM(CASE [type] WHEN '1' THEN [amt] ELSE 0 END) AS [1],  
	SUM(CASE [type] WHEN '2' THEN [amt] ELSE 0 END) AS [2],  
	SUM(CASE [type] WHEN '3' THEN [amt] ELSE 0 END) AS [3]
	 FROM (select * from zzjunk) AS Base_Data 
	GROUP BY [year]) AS Pivot_Data


.. by calling the procedure as shown below:

exec sp_Query_Pivot 'select * from zzjunk', '[year]', '[type]', 
	'Select distinct [type] from zzjunk', 'SUM', '[amt]', 'Y'

-- Base_Data_SQL gets all data from zzjunk
-- group by year
-- use the type column as headings
-- get the list of types available from the junk table,
-- use 'SUM' at each cell
-- sum the '[amt]' column
-- include a summary for the row

Example 2:
sp_Query_Pivot 'select * from fin_ben_allocation as fba inner join bmo_group as bg
	on fba.beneficiary_id = bg.bmo_group_id',
	'[eng_id]', '[bmo_group_desc_short]', 
	'Select bmo_group_desc FROM bmo_group', 'SUM', '[avoidance_pct]', 'Y'

Returns:
eng_id      PCCG	E!	PCG		IBG		Corp	RowTotal                                 
----------- ---------------------------------------- -----
1           1 		34  0       0       0       35
2           100     0   34      24      12      170



Arguments:
	Base_Data_SQL		SQL that returns data to be summarized
	Row_Headings		Comma-separated list of rows to use as groupings of data
	Column_Heading		Column to use as heading
	Column_Head_SQL		SQL that returns set of possible column headings
	Operation			SUM, PRODUCT, etc
	Op_Argument			Column to use as argument in operation


Steps in Routine: 
	1. Get list of distinct column headings
	2. Looping through column headings, ALTER  SQL for pivot
	3. Add summary SQL if required
	4. Execute


History:
Jeff Zohrab		Aug 13, 2001		Initial release

*/


ALTER   Procedure [dbo].[sp_Query_Pivot]
		@Base_Data_SQL		varchar(2000),  -- Table to use as recordsource to build final crosstab qry
		@Row_Headings		varchar(200),  	-- Comma-separated list of rows to use as groupings of data
		@Column_Heading		varchar(200),  	-- Column to use as heading
		@Column_Head_SQL	varchar(2000),  -- SQL that returns set of possible column headings
		@Operation			varchar(10),  	-- SUM, PRODUCT, etc
		@Op_Argument		varchar(200),  	-- Column to use as argument in operation
		@Add_Row_Summary	char(1)			-- 'Y' to include summary, 'N' to omit

AS 


Declare @SQL 			varchar(2000),
		@Summary_SQL 	varchar(2000)		-- to summarize each row

SET @SQL = 'SELECT ' + @Row_Headings + ', '
Set @Summary_SQL = ''


-- Get list of distinct column headings
CREATE TABLE #Col_Heads
	(
	Col_ID int identity(1,1),
	Col_Head varchar(200) NULL
	)
Exec ('INSERT INTO #Col_Heads(Col_Head) ' + @Column_Head_SQL)
-- select * from #Col_Heads -- debug check


-- loop through all columns, build pivot strings

DECLARE @Col_ID_Curr int,				-- column being checked
		@Col_ID_Old int,
		@Curr_Col_Head	varchar(200),
		@Pivot_SQL varchar(200)			-- pivot SQL for current column


SELECT TOP 1 @Col_ID_Curr = Col_ID, @Curr_Col_Head = Col_Head 
	FROM #Col_Heads ORDER BY Col_ID

IF (@Col_ID_Curr IS NOT NULL )	
	BEGIN

	-- dummy value to enter loop
	Set @Col_ID_Old = @Col_ID_Curr - 1

	WHILE (@Col_ID_Old <> @Col_ID_Curr)
		BEGIN

		-- print 'Adding pivot line for heading ' + @Curr_Col_Head -- debug check

		Set @Pivot_SQL = char(13) + @Operation
			+ '(CASE ' + @Column_Heading 
			+ ' WHEN ''' + @Curr_Col_Head + ''' THEN ' + @Op_Argument 
			+ ' ELSE 0 END) AS [' + @Curr_Col_Head +']'
		
		Set @SQL = @SQL + ' ' + @Pivot_SQL
	
		-- Add column name to summary list, if required
		If (@Add_Row_Summary='Y')
			Set @Summary_SQL = @Summary_SQL + 'Pivot_Data.[' + @Curr_Col_Head +']'

		-- Get the next column head
		-- if there are no more Col_Heads in the table, the select returns
		-- no records, and Col_ID_Curr doesn't change (exits the while loop)
		Set @Col_ID_Old = @Col_ID_Curr
		SELECT TOP 1 @Col_ID_Curr = Col_ID, @Curr_Col_Head = Col_Head 
			FROM #Col_Heads
			WHERE Col_ID > @Col_ID_Curr
			ORDER BY Col_ID


		-- Add delimiters to lists if this isn't the last column heading
		IF (@Col_ID_Old <> @Col_ID_Curr)
			Begin
			Set @SQL = @SQL  + ', '
			Set @Summary_SQL = @Summary_SQL  + ' + '	
			End

		END
	END



-- release objects
DROP TABLE #Col_Heads


-- Finish SQL
Set @SQL = @SQL + char(13) + ' FROM (' +  @Base_Data_SQL  + ') AS Base_Data ' 
	+ char(13) + 'GROUP BY ' + @Row_Headings


-- If summary requested, add enclosing Summary SQL
If (@Add_Row_Summary='Y')
	Begin
		Set @SQL = 'SELECT Pivot_Data.*, ' + char(13)
			+ ' (' + @Summary_SQL + ') AS RowTotal ' + char(13)
			+ 'FROM (' + @SQL + ') AS Pivot_Data'
	End


-- Done
Print @SQL
Exec (@SQL)

```
