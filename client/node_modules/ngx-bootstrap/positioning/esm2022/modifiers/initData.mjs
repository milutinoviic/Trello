import { computeAutoPlacement, getReferenceOffsets, getTargetOffsets } from '../utils';
export function initData(targetElement, hostElement, position, options) {
    if (!targetElement || !hostElement) {
        return;
    }
    const hostElPosition = getReferenceOffsets(targetElement, hostElement);
    if (!position.match(/^(auto)*\s*(left|right|top|bottom|start|end)*$/)
        && !position.match(/^(left|right|top|bottom|start|end)*(?: (left|right|top|bottom|start|end))*$/)) {
        position = 'auto';
    }
    const placementAuto = !!position.match(/auto/g);
    // support old placements 'auto left|right|top|bottom'
    let placement = position.match(/auto\s(left|right|top|bottom|start|end)/)
        ? position.split(' ')[1] || 'auto'
        : position;
    // Normalize placements that have identical main placement and variation ("right right" => "right").
    const matches = placement.match(/^(left|right|top|bottom|start|end)* ?(?!\1)(left|right|top|bottom|start|end)?/);
    if (matches) {
        placement = matches[1] + (matches[2] ? ` ${matches[2]}` : '');
    }
    // "left right", "top bottom" etc. placements also considered incorrect.
    if (['left right', 'right left', 'top bottom', 'bottom top'].indexOf(placement) !== -1) {
        placement = 'auto';
    }
    placement = computeAutoPlacement(placement, hostElPosition, targetElement, hostElement, options ? options.allowedPositions : undefined);
    const targetOffset = getTargetOffsets(targetElement, hostElPosition, placement);
    return {
        options: options || { modifiers: {} },
        instance: {
            target: targetElement,
            host: hostElement,
            arrow: void 0
        },
        offsets: {
            target: targetOffset,
            host: hostElPosition,
            arrow: void 0
        },
        positionFixed: false,
        placement,
        placementAuto
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdERhdGEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvcG9zaXRpb25pbmcvbW9kaWZpZXJzL2luaXREYXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFDTCxvQkFBb0IsRUFDcEIsbUJBQW1CLEVBQ25CLGdCQUFnQixFQUNqQixNQUFNLFVBQVUsQ0FBQztBQUlsQixNQUFNLFVBQVUsUUFBUSxDQUN0QixhQUErQixFQUFFLFdBQTZCLEVBQUUsUUFBZ0IsRUFBRSxPQUFpQjtJQUduRyxJQUFJLENBQUMsYUFBYSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDbkMsT0FBUTtJQUNWLENBQUM7SUFFRCxNQUFNLGNBQWMsR0FBRyxtQkFBbUIsQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFFdkUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsZ0RBQWdELENBQUM7V0FDaEUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLDZFQUE2RSxDQUFDLEVBQUUsQ0FBQztRQUM1RixRQUFRLEdBQUcsTUFBTSxDQUFDO0lBQzFCLENBQUM7SUFFSCxNQUFNLGFBQWEsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUVoRCxzREFBc0Q7SUFDdEQsSUFBSSxTQUFTLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyx5Q0FBeUMsQ0FBQztRQUN2RSxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxNQUFNO1FBQ2xDLENBQUMsQ0FBQyxRQUFRLENBQUM7SUFFYixvR0FBb0c7SUFDcEcsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQywrRUFBK0UsQ0FBQyxDQUFDO0lBQ2pILElBQUksT0FBTyxFQUFFLENBQUM7UUFDWixTQUFTLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNoRSxDQUFDO0lBRUQsd0VBQXdFO0lBQ3hFLElBQUksQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUN2RixTQUFTLEdBQUcsTUFBTSxDQUFDO0lBQ3JCLENBQUM7SUFFRCxTQUFTLEdBQUcsb0JBQW9CLENBQzlCLFNBQVMsRUFDVCxjQUFjLEVBQ2QsYUFBYSxFQUNiLFdBQVcsRUFDWCxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUMvQyxDQUFDO0lBRUYsTUFBTSxZQUFZLEdBQUcsZ0JBQWdCLENBQUMsYUFBYSxFQUFFLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUVoRixPQUFPO1FBQ0wsT0FBTyxFQUFFLE9BQU8sSUFBSSxFQUFDLFNBQVMsRUFBRSxFQUFFLEVBQUM7UUFDbkMsUUFBUSxFQUFFO1lBQ1IsTUFBTSxFQUFFLGFBQWE7WUFDckIsSUFBSSxFQUFFLFdBQVc7WUFDakIsS0FBSyxFQUFFLEtBQUssQ0FBQztTQUNkO1FBQ0QsT0FBTyxFQUFFO1lBQ1AsTUFBTSxFQUFFLFlBQVk7WUFDcEIsSUFBSSxFQUFFLGNBQWM7WUFDcEIsS0FBSyxFQUFFLEtBQUssQ0FBQztTQUNkO1FBQ0QsYUFBYSxFQUFFLEtBQUs7UUFDcEIsU0FBUztRQUNULGFBQWE7S0FDZCxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIGNvbXB1dGVBdXRvUGxhY2VtZW50LFxuICBnZXRSZWZlcmVuY2VPZmZzZXRzLFxuICBnZXRUYXJnZXRPZmZzZXRzXG59IGZyb20gJy4uL3V0aWxzJztcblxuaW1wb3J0IHsgRGF0YSwgT3B0aW9ucyB9IGZyb20gJy4uL21vZGVscyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0RGF0YShcbiAgdGFyZ2V0RWxlbWVudDogSFRNTEVsZW1lbnR8bnVsbCwgaG9zdEVsZW1lbnQ6IEhUTUxFbGVtZW50fG51bGwsIHBvc2l0aW9uOiBzdHJpbmcsIG9wdGlvbnM/OiBPcHRpb25zXG4pOiBEYXRhfHVuZGVmaW5lZCB7XG5cbiAgaWYgKCF0YXJnZXRFbGVtZW50IHx8ICFob3N0RWxlbWVudCkge1xuICAgIHJldHVybiA7XG4gIH1cblxuICBjb25zdCBob3N0RWxQb3NpdGlvbiA9IGdldFJlZmVyZW5jZU9mZnNldHModGFyZ2V0RWxlbWVudCwgaG9zdEVsZW1lbnQpO1xuXG4gIGlmICghcG9zaXRpb24ubWF0Y2goL14oYXV0bykqXFxzKihsZWZ0fHJpZ2h0fHRvcHxib3R0b218c3RhcnR8ZW5kKSokLylcbiAgICAmJiAhcG9zaXRpb24ubWF0Y2goL14obGVmdHxyaWdodHx0b3B8Ym90dG9tfHN0YXJ0fGVuZCkqKD86IChsZWZ0fHJpZ2h0fHRvcHxib3R0b218c3RhcnR8ZW5kKSkqJC8pKSB7XG4gICAgICAgICAgICBwb3NpdGlvbiA9ICdhdXRvJztcbiAgICB9XG5cbiAgY29uc3QgcGxhY2VtZW50QXV0byA9ICEhcG9zaXRpb24ubWF0Y2goL2F1dG8vZyk7XG5cbiAgLy8gc3VwcG9ydCBvbGQgcGxhY2VtZW50cyAnYXV0byBsZWZ0fHJpZ2h0fHRvcHxib3R0b20nXG4gIGxldCBwbGFjZW1lbnQgPSBwb3NpdGlvbi5tYXRjaCgvYXV0b1xccyhsZWZ0fHJpZ2h0fHRvcHxib3R0b218c3RhcnR8ZW5kKS8pXG4gICAgPyBwb3NpdGlvbi5zcGxpdCgnICcpWzFdIHx8ICdhdXRvJ1xuICAgIDogcG9zaXRpb247XG5cbiAgLy8gTm9ybWFsaXplIHBsYWNlbWVudHMgdGhhdCBoYXZlIGlkZW50aWNhbCBtYWluIHBsYWNlbWVudCBhbmQgdmFyaWF0aW9uIChcInJpZ2h0IHJpZ2h0XCIgPT4gXCJyaWdodFwiKS5cbiAgY29uc3QgbWF0Y2hlcyA9IHBsYWNlbWVudC5tYXRjaCgvXihsZWZ0fHJpZ2h0fHRvcHxib3R0b218c3RhcnR8ZW5kKSogPyg/IVxcMSkobGVmdHxyaWdodHx0b3B8Ym90dG9tfHN0YXJ0fGVuZCk/Lyk7XG4gIGlmIChtYXRjaGVzKSB7XG4gICAgcGxhY2VtZW50ID0gbWF0Y2hlc1sxXSArIChtYXRjaGVzWzJdID8gYCAke21hdGNoZXNbMl19YCA6ICcnKTtcbiAgfVxuXG4gIC8vIFwibGVmdCByaWdodFwiLCBcInRvcCBib3R0b21cIiBldGMuIHBsYWNlbWVudHMgYWxzbyBjb25zaWRlcmVkIGluY29ycmVjdC5cbiAgaWYgKFsnbGVmdCByaWdodCcsICdyaWdodCBsZWZ0JywgJ3RvcCBib3R0b20nLCAnYm90dG9tIHRvcCddLmluZGV4T2YocGxhY2VtZW50KSAhPT0gLTEpIHtcbiAgICBwbGFjZW1lbnQgPSAnYXV0byc7XG4gIH1cblxuICBwbGFjZW1lbnQgPSBjb21wdXRlQXV0b1BsYWNlbWVudChcbiAgICBwbGFjZW1lbnQsXG4gICAgaG9zdEVsUG9zaXRpb24sXG4gICAgdGFyZ2V0RWxlbWVudCxcbiAgICBob3N0RWxlbWVudCxcbiAgICBvcHRpb25zID8gb3B0aW9ucy5hbGxvd2VkUG9zaXRpb25zIDogdW5kZWZpbmVkXG4gICk7XG5cbiAgY29uc3QgdGFyZ2V0T2Zmc2V0ID0gZ2V0VGFyZ2V0T2Zmc2V0cyh0YXJnZXRFbGVtZW50LCBob3N0RWxQb3NpdGlvbiwgcGxhY2VtZW50KTtcblxuICByZXR1cm4ge1xuICAgIG9wdGlvbnM6IG9wdGlvbnMgfHwge21vZGlmaWVyczoge319LFxuICAgIGluc3RhbmNlOiB7XG4gICAgICB0YXJnZXQ6IHRhcmdldEVsZW1lbnQsXG4gICAgICBob3N0OiBob3N0RWxlbWVudCxcbiAgICAgIGFycm93OiB2b2lkIDBcbiAgICB9LFxuICAgIG9mZnNldHM6IHtcbiAgICAgIHRhcmdldDogdGFyZ2V0T2Zmc2V0LFxuICAgICAgaG9zdDogaG9zdEVsUG9zaXRpb24sXG4gICAgICBhcnJvdzogdm9pZCAwXG4gICAgfSxcbiAgICBwb3NpdGlvbkZpeGVkOiBmYWxzZSxcbiAgICBwbGFjZW1lbnQsXG4gICAgcGxhY2VtZW50QXV0b1xuICB9O1xufVxuIl19