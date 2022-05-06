# Note: If updating tileserver-gl version from v3.1.1, may need to update resources/utils.js and/or resources/server.js 
#    to maintain compatibility and still provide publicUrl using relative path and x-forwarded-prefix lookup.
FROM maptiler/tileserver-gl:v3.1.1

ADD resources/index.css /app/public/resources/

# Modify how publicUrl is used to create paths. See https://github.com/maptiler/tileserver-gl/pull/558
# Note: That PR isn't sufficient; we also need to adjust how getTileUrls (in utils.js) returns tile urls with publicUrl and how the template data 
#    is populated (in server.js). See resources/utils.js (~line 10, ~line 67) and resources/server.js (~line 319).
# Also note: This also allows tileserver URLS to match the requested protcol (http/https)
ADD resources/utils.js /app/src/  

ADD resources/server.js /app/src/ 