# Vehicle Routing based on Heuristic Approach

## Improvements

- Relocate and Exchange change filter out single array to check weightAvaiable (no case?? maybe in relocate/exchange single route could be added/swapped?)
- Make options usage more option-like? (refactor it)
- options default value from config
- Improve anneling prob handling code? currently looks redundant
- Copy vehicles in relocate and exchange to prevent modifing source input(remove from react function after change)
- Error Boundary in react instead of try/catch?
- Remove legacy code
- Remove tabuList from Option interface