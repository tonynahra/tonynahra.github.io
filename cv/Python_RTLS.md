```python
import pandas as pd
import numpy as np
import datetime as dt
# from pivottablejs import pivot_ui
tags= pd.read_csv('Staff_List.CSV',usecols=['Tag ID','Department','Last Report Date','Location'])
tags = tags.rename(columns={'Tag ID': 'TagID', 'Last Report Date': 'LastDate'})
tags["LastDate"] = tags["LastDate"].apply(pd.to_datetime)

dataset = pd.DataFrame(tags)

def DateRange1Month(X):
    if X < 30 :
        return "X"
    else:
        return ""
    
def DateRange3Month(X):
    if X >= 30 and X < 180 :
        return "X"
    else:
        return ""
    
def DateRange12Month(X):
    if X >= 180 and X < 365 :
        return "X"
    else:
        return ""
    
def DateRangeInYear(X):
    if X >= 365 :
        return "X"
    else:
        return ""
    
GRP = dataset.groupby(['Department']).agg( Cnt=('TagID', len ) , Last =( 'LastDate' ,  np.max )  )
GRP["LastSeen"] = ( dt.datetime.now() - GRP['Last']  ).dt.days 
GRP["Within_1_month"] = GRP['LastSeen'].apply(DateRange1Month)
GRP["Within_3_months"] = GRP['LastSeen'].apply(DateRange3Month)
GRP["Within_year"] = GRP['LastSeen'].apply(DateRange12Month)
GRP["more_than_year"] = GRP['LastSeen'].apply(DateRangeInYear)

GRP = GRP.drop( ['Last'] , axis=1)

def applyStyleM(series):
    return [ 'color: green;' if e < 10.0 else '' for e in series ]

def applyStyleH(series):
    return [ 'color: red;' if e < 180 else '' for e in series ]

GRP.style.apply(applyStyleM, axis=0, subset=['LastSeen'])
GRP.style.apply(applyStyleH, axis=0, subset=['LastSeen'])

GRP.to_html('RTLStags.html', classes='table table-striped')
```
