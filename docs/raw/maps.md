# **Maps**

!!! warning  "TODO"
    Add section on configuring tileserver-gl with json file to serve multiple tilesets and to serve vector tiles.


Mole includes a service that serves map tiles using [tileserver-gl](https://github.com/klokantech/tileserver-gl). To 
serve an set of map tiles in the .mbtiles format, place the file in the `maps/maptiles` folder.  

!!! tip "Note"
    The .mbtiles file must have the `name` and `format` metadata tables set.  See the [.mbtiles spec](https://github.com/mapbox/mbtiles-spec/blob/master/1.3/spec.md) 
    for more information.  The instructions below describe adding the appropriate metadata.

The tiles will be served at 

    http://localhost:8081/data/<filename_without_extension>/<z>/<y>/<x>.jpg
    
A map preview is served at 

    http://localhost:8081/data/<filename_without_extension>

The `maps` service runs by default.  To disable it, use the `--nomaps` flag to `./ml run`:

    ./ml run --nomaps
    
## **Generating Aerial Imagery Map Tiles**

This section describes methods for obtaining aerial imagery and processing it into an .mbtiles file to be served by the 
Mole map tile server.

### **Acquiring Aerial Imagery** 
   
#### **Digital Globe Imagery (preferred method)**
 
Government employees can get access to Digital Globe imagery.  This generally provides more recent data than that available via the NGA
national map site. If you have access to Digital Globe, log in at  [https://evwhs.digitalglobe.com](https://evwhs.digitalglobe.com) .  
Here you can select a region of interest to download.
 
1. Define an area of interest with the drawing tool.
2. Select Generate a tileset
    1. Enter Name
    2. Set "End Zoom Level" to 18
3. Click `<Save>`
4. Files will be available under `My Imagery --> Library` once they have been prepared (takes a while)
5. Uncompress the archive

#### **National Map Imagery (method 2)**

Go to  [http://viewer.nationalmap.gov/basic/](http://viewer.nationalmap.gov/basic/)  to download imagery for region of interest.

1. Select "Imagery - 1 foot (HRO)" at the left
    1. Zoom to desired bounding box
    2. Click the black square icon 
    3. Draw desired bounding box.
    4. Click the "Find Products" button at the top of the left pane.
        1. You can add additional search options (e.g. "CL" for only 3 band color imagery or "4B" for 4 band color imagery) 
2. Add all items to the card by pressing the "+All" icon for each page in the search returns
    1. This is tedious. Please update this page if you find a better way.
3. Click "View Cart"
4. Click "List and Export Cart Items"
    1. This will spawn a file download that corresponds to a .csv file with download links and information about each of the
requested images.
5. Download the files in the .csv file by either using the download manager (java program) 
6. Unzip all downloaded files.
    1. This should result in a set of .jp2 files.


### **Processing Imagery into .mbtiles** 

#### **Digital Globe Imagery**

The archive downloaded above already has a tiled structure.  We just need to create an mbtiles file.  The 
[mbutil](https://github.com/mapbox/mbutil) utility can do this.

1. Install mbutil
    1. `git clone http://github.com/mapbox/mbutil.git`
2. Change directory to the base of the Digital Globe tileset
    1. Sub-directories at this level should be numbers (e.g., /12/)
3. Create `metadata.json` file:

     `echo '{"name": "<desired_tileset_name>", "format": "jpg"}' > metadata.json`

4. Create the .mbtiles file:

    `mbutil/mb-util --image_format=jpg ./ <filename>.mbtiles`


#### **National Map Imagery (method 2)**
1. In the folder containing the downloaded .jp2 files, run the following commands:
    1. `gdalbuildvrt index.vrt *.jp2`
    2. `gdalwarp -r near --config GDAL_CACHEMAX 3000 -wm 3000 -co compress=jpeg -co photometric=ycbcr -co tiled=yes -t_srs
EPSG:3857 index.vrt <filename>.tif`
        1. see  [http://www.gdal.org/gdalwarp.html](http://www.gdal.org/gdalwarp.html) for more options, particularly for 
        the resampling method (-r flag)
    3. `gdaladdo -r nearest --config COMPRESS_OVERVIEW JPEG --config PHOTOMETRIC_OVERVIEW YCBCR <filename>.tif 2 4 8 16
32 64 128`
        1. see  [http://www.gdal.org/gdaladdo.html](http://www.gdal.org/gdaladdo.html) for more options, particularly for 
        the resampling method (-r flag)
2. Use gdal2tiles.py to cut the tiles.
    1. Install gdal2tiles.py 
        1. `sudo apt-get install python-gdal`
    2. `gdal2tiles.py <filename>.tif`
        1. This will create a folder called <filename> with appropriate tiles in it
3. Use mbutil to create the mbtiles file
    1. Install mbutil
        1. `git clone http://github.com/mapbox/mbutil.git`
    1. `./mbutil/mb-util --scheme=tms <filename>/ <filename>.mbtiles`
