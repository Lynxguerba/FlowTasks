@[src/components/ProjectWorkspace.jsx] we need to update this page, so we need to implement autotamic creating  workflow by adding tasks in the left side of the sidebar. as you notice there is Todos section in the sidebar, I want you to set that at the top to make it prioritize section:


## Project Workspace canvas changes:

        Auto creating workflow base on the creating tasks with connection nodes base on the shapes.
        Once there is new tasks in the sidebar it will auto add on the canvas with connection base on the set up of the tasks in the sidebar.
        For project title, first node or shape is circle, make it streatchable if the name of the project is long but set a limit of the width streach of the circle then it will proceed to the bottom or wrap the text then unlimeted adjust of the height of the circle if the title is long, add adjustable shape circle similar on the square. 
        For title, example use create new project "Project 1" in the @[src/components/Welcome.jsx] , once the user open the project that they created there is first shape appear and have text with the name of the project.

## Todos sidebar section changes:
        Put the Todos button at the top of the layout sidebar section
        If user create Todos by clicking the plus button, the modal appear. For modal, it show more option so that ther is connection of that task. example:
            User create Todos, input the text area.
            ther is option at the button of the text area, seletion of the shapes. After selecting the shapes, there is another option on where to connect that task in nodes/shape so that in the canvas determine where to connect the tasks. Example cases, user input text area 
            '''
                October 19 Hayat Clinic Social Media Content Creator
                Graphic Design Morning -  8:30PM PH base (oct 19)[Done]
                Reel 1 Afternoon - 2:30AM(advance 1 day should be oct 20)
                Reel 2 Evening - 7:30AM(advance 1 day should be oct 20)
            '''
            there is option at the bottom to ask where to connect. if cases have differt connect, example user want to connect it with the flow 1.. to get it here is the visualization:

            project name: Project 1

            Creating new task in the sidebar name: Flow 1 (since there is no other connection it will auto connect to the Project 1, so the flow is Project 1 ==> Flow 1, but the system ask to connect it to the root shape.)
            user creating now another flow, FLow 2 (same also user have a choice to connect the Flow 2 to the Root Node or project name, so it will be Project 1 ==> Flow 2)
            Now if user creat new tasks in todos, example "Tasks 1", there is selection again on where to connect, selection must be Flow 1 and Flow 2, if user decide to connect it on the Flow 1 , then in the canvas will connect it but Project 1 ==> Flow 1 ==> Tasks 1(Note, It is important that user can select also a shapes)
            Now if user create another Tasks 2, decide to connect it to the Flow 2, it will same cases on the Flow 2. If user create Tasks 3 and connect to the Flow 1, it will look like this:
            
            Project 1 ==> Flow 1 ==> Task 1
                                  ==> Task 3

            NOte: it is not task 1 and task 3 connected. 

            NOw if user create todos for sub-task 1 and connect it to the Tasks 2. it will be look like this:
            Project 1 => Flow 2 => Task 2 => sub-task 1

            So that in the canvas can connect it properly. 


## Alignment of the shapes:
    For the alignment, the root nodes which is the name of the project will set on the top, the rest connection will be set at the bottom of the Root nodes, same on the other flow nodes and tasks nodes. 

    Make sure that it will auto align once there is new nodes created by the todos section. 

## Flow vs Task:
    This one in todos section, there is selection if that text is Flow or task, to determine it if Flow there is no completed button or cirle to click to complete the task, the Flow assign as connector between the real tasks and other nodes. example Project 1(which is Flow as default) => Flow 1(Flow by user seclection) => task 1 (Tasks by user selection)

    FOr tasks there is completed check circle and deletion button. 

    Add border color for this once as indicator if that nodes/shape is Flow or Tasks, Root nodes set as defualt color as Gray border line of the shape. for Flow (White) and for Taks is (blue), red if the the tasks is deleted

## Nodes Deletion:
    The tasks that been deleted in todos will remain in the canvas but the border color is red, so there is Trash Bin for deletion of tasks, handle for temporary deletion. If user delete the nodes it will store in the trash bin, if the case if task is deleted same also it will store on the bin but in the canvas it will indicate as delete by changing the color into red.

## Auto connect once there is nodes deleted:
    IMplement also auto connect once there deleted nodes, example:

    Project 1 => Flow 1 => Task 1 => sub-task 1

    If user delete the Task 1 it will look like this:

    Project 1 => Flow 1 => sub-task 1


## Keep the Manual:
    Keep the Manual applying draggin nodes/shape on the canvas but in the sidebar Todos section it will ask if that is Flow or Tasks so that it can determen and user can edit that nodes type.

Note: this changes will apply on the new project created, so if there is already created project on this app base on the @[src/data] file it will not be affected on the update, the canvas form will remain. 