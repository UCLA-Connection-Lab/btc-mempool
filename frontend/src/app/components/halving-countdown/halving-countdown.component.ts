import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { StateService } from '@app/services/state.service';

interface HalvingProgress {
  blocksUntilHalving: number;
  timeUntilHalving: number;
  nextSubsidy: number;
  percentComplete: number;
}

const EPOCH_BLOCK_LENGTH = 2016; // Bitcoin mainnet

@Component({
  selector: 'app-halving-countdown',
  templateUrl: './halving-countdown.component.html',
  styleUrls: ['./halving-countdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HalvingCountdownComponent implements OnInit {
  @Input() showTitle = true;

  isLoadingWebSocket$: Observable<boolean>;
  halvingProgress$: Observable<HalvingProgress>;
  now: number = Date.now();

  constructor(
    public stateService: StateService,
  ) { }

  ngOnInit(): void {
    this.isLoadingWebSocket$ = this.stateService.isLoadingWebSocket$;
    this.halvingProgress$ = combineLatest([
      this.stateService.blocks$,
      this.stateService.difficultyAdjustment$,
    ])
    .pipe(
      map(([blocks, da]) => {
        const maxHeight = blocks.reduce((max, block) => Math.max(max, block.height), 0);
        const blocksUntilHalving = 210000 - (maxHeight % 210000);
        const timeUntilHalving = new Date().getTime() + (blocksUntilHalving * 600000);
        const percentComplete = ((210000 - blocksUntilHalving) / 2100);
        this.now = new Date().getTime();

        const data = {
          blocksUntilHalving,
          timeUntilHalving,
          nextSubsidy: getNextBlockSubsidy(maxHeight),
          percentComplete,
        };
        return data;
      })
    );
  }
}

function getNextBlockSubsidy(height: number): number {
  const halvings = Math.floor(height / 210_000) + 1;
  // Force block reward to zero when right shift is undefined.
  if (halvings >= 64) {
    return 0;
  }

  let subsidy = BigInt(50 * 100_000_000);
  // Subsidy is cut in half every 210,000 blocks which will occur approximately every 4 years.
  subsidy >>= BigInt(halvings);
  return Number(subsidy);
}
