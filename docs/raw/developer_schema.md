[comment]: <> (Schema generation is currently broken. Once it is fixed, this file will be included in mkdocs.yml.)

Mole supports the automatic generation of [OpenAPI](https://github.com/OAI/OpenAPI-Specification) schemas. This will allow users to see what resources are avaliable via the Mole API.

## ** Generating an OpenAPI Schema **

There are two ways to generate a schema for Mole:

1. Generate the schema using `./ml docs --generate-schema`
2. Use the docker-compose exec command.

```shell
$ docker-compose exec django python manage.py generateschema --file openapi_schema.yml
```

The generated schema will be located in `/mole/openapi_schema.yml`.

## ** Rendering the OpenAPI Schema to PDF **

The openapi_schema.yml file can be rendered to a human readable .pdf file using [RapiPDF](https://github.com/mrin9/RapiPdf)

1. Clone the above repository
2. Copy the mole/openapi_schema.yml file to the docs/specs/ directory within the RapiPDF repository
3. Instal [npm](https://nodejs.org/en/) if necessary
4. Install [yarn](https://classic.yarnpkg.com/en/docs/install/) if necessary
5. Run `yarn serve --port 8011` within the cloned RapiPDF repository
6. Browse to [http://localhost:8011](http://localhost:8011)
7. Enter `./specs/openapi_schema.yml` into one of the form fields next to "GENERATE PDF"
8. Click "GENERATE PDF"
