###############################################################################
# Version: 27-August-2015
###############################################################################

# Your server's base URL:
baseURL = "http://localhost:3000/api/v1"

############################## Utility functions ##############################
library(RCurl)
library(jsonlite)

# Authenticate
authenticate = function(username, password) {
  userinfo = toJSON(list(username=username, password=password), auto_unbox = TRUE)
  header = c(Accept="application/json; charset=UTF-8","Content-Type"="application/json")
  signinURL = paste(baseURL, "signin", sep = "/")
  result = postForm(signinURL,.opts=list(httpheader=header, postfields=userinfo))
  jwt <<- fromJSON(result)$accessToken
  authToken = paste("Authorization: Bearer", jwt)
  opts <<- list(httpheader = c(authToken))
}

# Get all accessible testbenchs
getTestbenchs = function() {
  url = paste(baseURL, "testbenchs", sep = "/")
  return(fromJSON(getURL(url, .opts = opts)))
}

# Get one testbench
getTestbench = function(testbenchId) {
  url = paste(baseURL, "testbenchs", testbenchId, sep = "/")
  return(fromJSON(getURL(url, .opts = opts)))
}

# Get all CSV files for an testbench
getTestrunsForTestbench = function(testbenchId) {
  url = paste(baseURL, "testbenchs", testbenchId, "testruns", sep = "/")
  return(fromJSON(getURL(url, .opts = opts)))
}

# Download testrun
downloadTestrun=function(testbenchId, testrunId, localFilePath) {
  f = CFILE(localFilePath, mode="wb")
  url = paste(paste(baseURL, "testbenchs", testbenchId, "testruns", testrunId, sep = "/"), ".csv", sep="")
  a = curlPerform(url = url, .opts = opts, writedata = f@ref, noprogress=FALSE)
  close(f)
  return(a)
}

getStatistic = function(testbenchId, testrunId, columnName, statisticType) {
  url = paste(
    paste(baseURL, "testbenchs", testbenchId, "statistics", sep="/"),
    paste(
      paste("testrunId", testrunId, sep="="),
      paste("column", columnName, sep="="),
      paste("statistic", statisticType, sep="="),
  return(fromJSON(getURL(url, .opts = opts)))
}

getEvents = function(testbenchId, testrunId) {
  url = paste(
    paste(paste(baseURL, "testbenchs", testbenchId, "testruns", testrunId, sep="/"), ".tsv", sep=""),
    paste(
      paste("token", jwt, sep="="), sep="&"), sep="?")
  return(read.delim(url))
}

###############################################################################

################################ Example Usage ################################

# Get all testbenchs
testbenchs <- getTestbenchs()

# Use the first testbench
firstTestbenchId <- testbenchs[1,'_id']

# Get the CSV files for this testbench
testruns <- getTestrunsForTestbench(firstTestbenchId)
firstTestrun <- testruns[1,]

# Get the mean for that population
getStatistic(firstTestbenchId, firstTestrun$'_id', firstTestrun$panel[[1]][1,'column'], "mean")

# Or, get the events and make a plot in R
# Caution -- this can take a long time for R to parse
getEvents(firstTestbenchId, firstTestrun$'_id')

# Download an CSV file
localFileName <- firstTestrun$filename[1]
downloadTestrun(firstTestbenchId, firstTestrun$'_id', localFileName)

library("csv") #Sumit just a place holder to library for reading csv file in R may not be accurate
csv <- read.CSV(localFileName)

# Print summary information
summary(csv)

