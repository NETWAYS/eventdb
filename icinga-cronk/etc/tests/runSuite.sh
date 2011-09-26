#!/bin/sh
if type -P phpunit &> /dev/null == 0
then
	phpunit --verbose --configuration=suite.xml 
else
	echo "You need the newest phpunit package from pear in order to run the tests!"
fi
