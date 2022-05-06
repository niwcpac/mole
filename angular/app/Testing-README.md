#ANGULAR MOLE TESTING

For Angular Mole we are using the [Jasmine Unit Testing Framework](https://howtodoinjava.com/javascript/jasmine-unit-testing-tutorial/).

Another [Jasmine Intro](https://www.freecodecamp.org/news/jasmine-unit-testing-tutorial-4e757c2cbf42/)


## Running Tests
	
Navigate to the app directory `angular/app/src/app` 

Then from terminal use command `ng test` to run the entire test suite. 

	
## Basics Of Tests

Each component, pipe, service, etc has a test suite that is associated with it. To define a test suite in Jasmine we use
the `describe` function that takes two parameters:
- `String`: The title of the suite 
- `function`: Function that implements the suite

Each suite is made up of unit tests that are each defined with the `it` function which also takes two parameters:
- `String`: Name of the unit test
- `function`: Function that implements the unit test 


# Running In Isolation

#### Before Each Function
To Run tests in true isolation we set up all construction of (components / objects / services / etc) along with any other
setup before we run an `it()` spec unit test. When `beforeEach()` is placed within the test suite `define()` it will automatically
be run before each `it()` within the test suite.
 
 `beforeEach()` contains built in `async` capabilities which automatically calls
`done()` before moving on to each unit test.

#### After Each Function
Similar to the `beforeEach()`, `afterEach()` when placed within the test suite `define()`, will run after each `it()` unit
test. This is especially useful for any kind of cleanup needed or when using mock HttpCalls.


# TestBed

`TestBed` is the primary API for unit testing Angular applications. `TestBed` will configure and initialize the environment
which grants methods to help in construction of components, services, etc. Allows overriding 
default providers, directives, pipes, modules of the test injector, which are defined in test_injector.js 

#####configureTestingModule
When configuring the test environment with imports, providers, and declarations (just like one would use for component creation),
the `configureTestingModule()` is used where a moduleDefinition object is passed to it. 

**For anything being tested that has dependencies on other services or whatnot, will be mocked to maintain isolation testing.
To do this one overrides the component and uses factorys to generate mock objects wherever specified dependency is needed.
Ex. ImageDialogComponent relies on MatDialogRef and MAT_DIALOG_DATA to build

    beforeEach(async(() => {
        TestBed.configureTestingModule({
          declarations: [ ImageDialogComponent ]
    
        }).overrideComponent(ImageDialogComponent, {
          set: {
            providers: [
              {provide: MatDialogRef, useFactory: () => new MockMatDialogRef()},
              {provide: MAT_DIALOG_DATA, useFactory: () => {} }
            ],
    
          }
        }).compileComponents();
      }));
      
[More On Injecting Mock classes for Testing](https://github.com/angular/angular/issues/10727)

##Testing Template HTML CODE
When testing templates you will use the debugElement to access the DOM properties and attributes of the component

    fixture = TestBed.createComponent(ImageDialogComponent);
    component = fixture.debugElement.componentInstance;

with the debugElement one can query through css to grab any element in the DOM and test various aspects of it such as

is it null due to a ngIf directive:

    let title_heading = fixture.debugElement.query(By.css('h1'));
    expect(title_heading).not.toBeNull();

does it have certain property values set:

    expect(title_heading.properties.innerText.trim()).toEqual("Images");
    
triggers an event tied to it (like a button with click event): 

    let button = fixture.debugElement.query(By.css('button'));
    button.triggerEventHandler('click', {});
    expect(on_event_type_click_spy).toHaveBeenCalled();
        
(  In this example we use triggerEventHandler which takes two arguments
    
 1: the name of event as string, in this case 'click' 
 
 2: the event object that will be passed  )
             
 
** We can also test to see if the triggered event is called with a specific value with 
    
    toHaveBeenCalledWith( args )

***!!! WHEN TESTING TEMPLATE CODE NO CHANGES WILL HAPPEN IN TEST SUITE TILL CHANGES ARE DETECTED !!!
To do this use:

    detectChanges()
    
So if above button trigger event test were run without detectChanges it will fail since detectChanges was not run after
initiating the triggerEventHandler
so full working example would be:

    let button = fixture.debugElement.query(By.css('button'));
    button.triggerEventHandler('click', {});
    fixture.detectChanges();
    expect(on_event_type_click_spy).toHaveBeenCalled(); 

This applies for all changes to template such as an ngIf or ngFor based on specific conditions that were changed since
test suite compiled the component to be tested.


#Spies
Spies are a useful testing tool that allows one to take an object and override that objects specific method so that at
anytime during the running of the test when a specific method that is being spied on is called, the specified spy function 
will run instead. 

This is especially useful when you have a method that needs to call other class methods to complete. Since we want as much
isolation as possible when testing we spy on these methods and return mock values to see if the outer function being tested 
works.

Ex.
    
    //Spy on open method belonging to the components dialog object and whenever called return 7
    let dialog_spy = spyOn(component.dialog, 'open').and.returnValue( 7 );

Spies will exist within the scope they are declared. Any global spies will exists throughout all of the tests while those
declared within a unit test will only be available to that specific test.

Another purpose of spies is to see if the spied on method is called or not

    expect(dialog_spy).toHaveBeenCalled();
    
or if its called with specific arguments

    expect(dialog_spy).toHaveBeenCalledWith( {'one': 1, 'two': 2} ); 

If a global spy is set and you need to call the actual implementation of the method use callThrough
    
    //This will now call the original method whenever the method being spied on is called
    dialog_spy.and.callThrough();

!!!! You CANNOT re-declare a spy on a method if the method is already being spied upon, if this is needed
 just change its value !!!!   
 
    //change spies value from returning 7 to calling a fake function that returns the string 'hello'
    let dialog_spy = spyOn(component.dialog, 'open').and.returnValue( 7 );
    dialog_spy.and.callFake( () => { return 'hello' } );
        
 !!!!!!!!Allowing re-declaration of spies for methods can be bypassed by setting the global settings to allow it but this is 
  not recommended !!!!!!!!
  
    jasmine.getEnv().allowRespy(true);
       
    
##Lifecycle Hook Testing 
When testing lifecycle hook functions that are part of the component creation process such as ngAfterInit we can mock
the component to properly test these methods in isolation. 
We mock the component by creating a mock class that extends the component to be tested and use spies in the method calls before
calling the super.method_name()

####ngOnChanges
[When testing ngOnChange methods in a testbed you have to update the @input attributes through a wrapper test component and pass the changes to the component being tested... cant just set the input value and call detect, wont work....has to be updated through the view (basically angular has to do it)](https://stackoverflow.com/questions/37408801/testing-ngonchanges-lifecycle-hook-in-angular-2#40317482)

For an Example see: 

`event-type-cards.component.spec.ts`

####Consturctor Tests
If you need to spy on methods or have certain things set before constructor for whatever is being tested is run, a great spot to do setup is in another
`beforeEach()` block. You can have multiple `beforeEach()` blocks that will all run before the creation of whatever is being tested.

    //In this case say we have asyncronous setup then once done set values before creation happens during the first test
    
    beforeEach(async(() => {
        ....Do stuff
      }));
    
     beforeEach(() => {
       ...Other stuff done, now Do More Stuff
     });

    it('first test', ()=>{
        ...
    });
