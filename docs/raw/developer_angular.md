# **User Interface**

## **Introduction**
The Mole user interface is built using the Angular web framework. You can read more
about the Angular framework [here](https://angular.io/).

## **Getting Started**
### **Install Angular CLI**
Before beginning development, it's recommended that you insall the Angular CLI. The CLI 
will give you a library of commands to generate components, services, modules, etc. as 
well as check for updates and run unit tests.

Install: `npm install -g @angular/cli`

### **Code Styling**
* **Variables**: camelCase
    * Service instances prefixed with underscore
* **Indentation**: 2 spaces
* **Curly Brackets**: Openning bracket inline with header


## **Project Structure**
The root of the project's working files is `angular > app > src > app`. The folder 
structure for the project was heavily informed by this [article](https://medium.com/@motcowley/angular-folder-structure-d1809be95542).

### **Modules**
Modules can be thought of as the pages within Mole. They are composed of a module 
typescript file and a component (generated seperately, see [Components](/developer_angular.html#components). 
Modules define the placement and layout of the components that make up a page. When 
generating a module, the Angular CLI will create a single typescript file where you can 
import the resources you would like to expose to components within the module.

!!! info "Generate a module within cwd:" 
    Local: `ng g m {module_name}`

    Shared: `ng g m --module shared {module_name}`

### **Components**
The user interface is broken into UI building blocks called "components". Every 
component has its own html, typescript, sass, and unit test file within a containing 
directory. When generating a component, the Angular CLI will create a named directory 
with template component files. Every component provides a custom html tag to be used 
throughout the app.

!!! info "Generate a component within cwd:"
    Local: `ng g c {component_name}`

    Shared: `ng g c --module shared {component_name}`

!!! warning "Important"
    The component typescript file should be restricted to only contain view logic. 
    Logic outside of this scope, especially if it will be used by other components, 
    should be contained within a [service](/developer_angular.html#services).

### **Services**
Services perform tasks for components and are especially useful when components are 
sharing the same resources. When generating a service, the Angular CLI will create a 
typescript file and unit test file within a named directory.

!!! info "Generate a local service within cwd:"
    Local: `ng g s {service_name}`

    Shared: `ng g s --module shared {service_name}`

### **Models**
Models are simply interfaces. All models are stored within `angular > app > src > app > 
shared > models`. You may allow multiple **related** models to share the same model 
file. If your model is an interface for an api model, you will need to write an adapter 
for the model. An adapter is essentially a function that taks a json object as a 
paramter and returns an instance of the model (see exmple below).

!!! info "Generate a model:"
    1. Create a new typescript file following this naming scheme: {model_name}.model.ts
    2. Update index.ts to export the models you created

``` typescript
    eventTypeAdapter(json: any): EventType {
        let eventType: EventType = {
        url: "",
        id: -1,
        name: json.name,
        description: json.description,
        eventLevel: json.event_level,
        ...
        };

        if (json.url) {
        eventType.url = json.url.replace("http://django:8000", "");
        }

        if (json.id) {
        eventType.id = json.id;
        }

        return eventType;
    }
```

## **Shared Directory**
Most components can be shared among multiple modules, that's the purpose of the 
`angular > app > src > app > shared` directory: to expose common components to all the 
modules. If you find yourself developing a component or service that will only be used 
by a single module, this code may be placed within that module's directory. 


## **Routing**
All app routes are defined in `app-routing.module.ts`. This file contains two exported 
constants: `routes` and `moleLinks`. 

* **`routes`** contains all the route objects for internal modules and are lazy loaded
* **`moleLinks`** contains all the route objects for external links

When you add a route object to this file, the side navigation menu is configured to 
list it without any additional configuration.


## **Sharing Data Between Components**
There are a few ways of sharing data between components, and Mole utilizes all of them. 
When developing the UI, it's important to be familiar with the @Input, @Output, and 
@ViewChild decorators, as well as rxjs Observables. A good resource for these concepts 
can bew viewed [here](https://fireship.io/lessons/sharing-data-between-angular-components-four-methods/).

### **Shared Modules**
The shared directly also includes two shared modules: `molemat.module.ts` and 
`shared.module.ts`.

* **`molemat.module.ts`**:
This module imports and exports all Angular Material modules so they can be used 
throughout the application.
* **`shared.module.ts`**:
This module imports all modules that are not Angular Material modules and exports all 
shared components.


## **UI Styling**
### **Colors**
All UI colors are defined in an Angular Material theme located in `angular > src > 
styles > _theme.scss`. Read more about theming Angular Material [here](https://material.angular.io/guide/theming).

!!! warning "Important"
    It is recommended not to hard-code colors within components and to reference the 
    theme instead.

### **Iconography**
There are two different icon libraries available for use throughout the project:

* **Material Design Icons**
    * See usage docs [here](https://material.angular.io/components/icon/overview).
    * See available icons [here](https://material.io/resources/icons/?icon=accessibility&style=baseline).
* **Font Awesome**
    * See usage docs [here](https://www.npmjs.com/package/@fortawesome/angular-fontawesome).
    * See available icons [here](https://fontawesome.com/icons?d=gallery).

### **Point Styles**
Point styles define the colors and icons of map markers and event types. Read more 
about point styles [here](/configuration.html#marker-styles).

## **Unit Testing**
Refer to [Angular Testing](/developer_angular_testing.html) for more details on unit 
testing.

!!! info "Run unit tests:"
    From `angular > app > src > app`, run `ng test`


## **Development Server**
The Angular development server hosts Mole on port `4200`. The Angular development 
server automatically spins up when you start mole. As changes are made in the codebase, 
the application auto-reloads to reflect the changes. This allows for a more rapid 
development experience.


## **Serve Static Files from Django**
The Angular container is able to build the Angular files to be served statically from 
Django. To build the files, use the `-a` flag on the `init` script. Mole will spin up a 
one-time angular container to build the static files into the docker volume. Once 
complete, the angular container will delete itself. Static files are hosted on port 
`8000/a`.

!!! info "Build Angular files to be served from Django:"
    `./ml init -a`

