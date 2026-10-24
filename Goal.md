# Goal
    Build a complete multi stage, multi agent scaffolding to enable autonomous software development. The outline of the agentic journey is available in this links
    https://academy.claude.com/courses/ai-native-sdlc-playbook/introduction
    https://academy.claude.com/courses/ai-native-sdlc-playbook/capture-intent
    https://academy.claude.com/courses/ai-native-sdlc-playbook/requirements-and-design
    https://academy.claude.com/courses/ai-native-sdlc-playbook/plan-mode
    https://academy.claude.com/courses/ai-native-sdlc-playbook/claude-md
    https://academy.claude.com/courses/ai-native-sdlc-playbook/skills-as-institutional-knowledge
    https://academy.claude.com/courses/ai-native-sdlc-playbook/parallel-sessions-and-subagents
    https://academy.claude.com/courses/ai-native-sdlc-playbook/give-claude-a-feedback-loop
    https://academy.claude.com/courses/ai-native-sdlc-playbook. As we navigate 
# Key Requirements
    The following are key requirements of this scaffolding. This needs to work well with any coding harness, we can start this with Claude code as the Coding Harness.
    ## Common Capabilities
    * Ability to create, invoke and agents for each stage of the PDLC and SDLC.
    * Ability to obtain context from a context graphs (PRODUCT_GRAPH, CODE_GRAPH, PATCH_GRAPH - each of which can be accessible via a configuration file. This is available in another GitHub project) // To be expanded most MVP
    * This entire solution must be accessible for all personas: Product Managers, Software Engineers, Quality Engineers and DevOps Engineers
    * The engagement interface must continue to be coding assistant. If required interface can be created for this personas using a combination of MODs, SKILLS and TOOLS.
    * Each agent must be able to ITERATE to achieve their GOAL
    ## ProdMgmtAgent (for REQUIREMENT PHASE)
    Establish a framework for a product management agent to pick up information from Jira Atlassian to convert CONCEPTS into Actionable USER STORIES
        ### Concept to EPIC Development
        Take a CONCEPT from JIRA Atlassian (using connection information & credentials) and develop them into a set of EPICs with Goals, Objective, Purpose, High Level Capabilities, Personas
        ### EPIC to STORY Development 
        Take each EPIC developed concepted to a CONCEPT and build them into multiple STORIES. The EPICs (key capabilities) needs to be broken down into multiple small STORIES. These stories must be meanifully small to code, configure, test and validate a clear set of requirements. These requirements would be a further deeper drill down of the key capabilities outlined in the epic but specific to the STORY. This may be equivalent to developing an INTENT.MD
        ### STORY REFINEMENT : Refine each story into a clear user story, with specific requirements. Move this Userstory into a task TODO in JIRA. The translates INTENT.MB into multiple SPECS.MD
        ### PDLC LOOP : Iterate this process until a clear set of objectives are in terms of STORY Refinement. Create a PROD_EVALAGENT to create a set of "SUCCESS CRITERIA" for evaluting if each STORY is good to move to next Phase 
    
    ## DesignAgent (for DESIGN PHASE)
    Establish a framework to develop technical architecture and design to convert the SPECS.MD / User Stories into a design. The agent must be able to build the target design considerations using the combination of the User Stories and architecture/design and code considerations. Base set of architecture, technology stack and design principles are available as ArchitectureDesign.MD. The code specific context, dependencies, package -> class -> method -> attribute is available in the context graph (CODE GRAPH)
    
    ## CodeAgent (for DEVELOPMENT PHASE)
    Establish a framework to develop code and unit test cases based on enriched SPECS.MD for one story at a time. If required, break the story into multiple sub tasks.  The agent must create a task_branch specific to the userstory. Build the target design considerations using the combination of the User Stories and architecture/design and code considerations. Base set of architecture, technology stack and design principles are available as ArchitectureDesign.MD. The code specific context, dependencies, package -> class -> method -> attribute is available in the context graph (CODE GRAPH)
    ### SDLC LOOP : Iterate this process until a clear set of objectives are in terms of CODE and UNIT TEST is complete and successful. Create a DEV_EVALAGENT to create a set of "SUCCESS CRITERIA" for SPECS. Evalute if the code developed and usecases tested are comprehensive enough and successful to to move to QA PHASE. If regression test cases fail as a part of the feedback from QualityAgent, then go back to previous commit position.

    ## QualityAgent (for QUALITY PHASE) 
    Establish a framework to develop Regression and UI validation cases based on a enriched SPECS.MD. Build the detailed ries and architecture/design and code considerations. Base set of architecture, technology stack and design principles are available as ArchitectureDesign.MD. The code specific context, dependencies, package -> class -> method -> attribute is available in the context graph (CODE GRAPH)
    ### QA-SDLC LOOP : Iterate the QualityAgent and CodeAgent until all functional and regression test cases pass. Use a Code-QA-feedback.MD file to share failures for CodeAgent to resolve. Iterate until the number of MAX_LOOPS defined in Agents.MD. 

* 